#encoding: utf-8
import datetime
from django.db.models.signals import post_save, pre_delete, post_delete
from django.contrib.contenttypes.models import ContentType
from planet.models import Feed, Post
from actstream import action
from actstream.models import Follow
from knesset.utils import cannonize, disable_for_loaddata
from agendas.models import AgendaVote, AgendaMeeting, AgendaBill, Agenda
from links.models import Link, LinkType

@disable_for_loaddata
def record_agenda_ascription_action(sender, created, instance, **kwargs):
    if created:
        action.send(instance.agenda, verb='agenda ascribed',
                    description='agenda "%s" ascribed to vote "%s"' % 
                        (instance.agenda.__unicode__(),instance.vote.title),
                    target = instance,
                    timestamp = datetime.datetime.now())
    else:
        action.send(instance.agenda, verb='agenda-vote relation updated',
                    description='relation between agenda "%s" and vote "%s" was updated' %
                        (instance.agenda.__unicode__(),instance.vote.title),
                    target = instance,
                    timestamp = datetime.datetime.now())
post_save.connect(record_agenda_ascription_action, sender=AgendaVote)

@disable_for_loaddata
def record_agenda_removal_action(sender, instance, **kwargs):
    action.send(instance.agenda, verb='agenda removed',
                description="agenda %s removed from vote %s" %
                    (instance.agenda.name,instance.vote.title),
                target = instance.vote,
                timestamp = datetime.datetime.now())
pre_delete.connect(record_agenda_removal_action, sender=AgendaVote)

@disable_for_loaddata
def record_agenda_bill_ascription_action(sender, created, instance, **kwargs):
    if created:
        action.send(instance.agenda, verb='agenda_bill_ascribed',
                    description='agenda "%s" ascribed to bill "%s"' %
                        (instance.agenda.__unicode__(),instance.bill.full_title),
                    target = instance,
                    timestamp = datetime.datetime.now())
    else:
        action.send(instance.agenda, verb='agenda_bill_relation_updated',
                    description='relation between agenda "%s" and bill "%s" was updated' %
                        (instance.agenda.__unicode__(),instance.bill.full_title),
                    target = instance,
                    timestamp = datetime.datetime.now())
post_save.connect(record_agenda_bill_ascription_action, sender=AgendaBill)

@disable_for_loaddata
def record_agenda_bill_removal_action(sender, instance, **kwargs):
    action.send(instance.agenda, verb='agenda removed',
                description="agenda %s removed from bill %s" % 
                    (instance.agenda.name,instance.bill.full_title),
                target = instance.bill,
                timestamp = datetime.datetime.now())
pre_delete.connect(record_agenda_bill_removal_action, sender=AgendaBill)

@disable_for_loaddata
def record_agenda_meeting_ascription_action(sender, created, instance, **kwargs):
    if created:
        action.send(instance.agenda, verb='agenda_meeting_ascribed',
                    description='agenda "%s" ascribed to meeting "%s"' %
                    (instance.agenda.__unicode__(),instance.meeting.title()),
                    target = instance,
                    timestamp = datetime.datetime.now())
    else:
        action.send(instance.agenda, verb='agenda_meeting_relation_updated',
                    description='relation between agenda "%s" and meeting "%s" was updated' %
                        (instance.agenda.__unicode__(), instance.meeting.title()),
                    target = instance,
                    timestamp = datetime.datetime.now())
post_save.connect(record_agenda_meeting_ascription_action, sender=AgendaMeeting)

@disable_for_loaddata
def record_agenda_meeting_removal_action(sender, instance, **kwargs):
    action.send(instance.agenda, verb='agenda_meeting_removed',
                description='agenda "%s" removed from meeting "%s"' %
                    (instance.agenda.__unicode__(),instance.meeting.title()),
                target = instance.meeting,
                timestamp = datetime.datetime.now())
pre_delete.connect(record_agenda_meeting_removal_action, sender=AgendaMeeting)

@disable_for_loaddata
def update_num_followers(sender, instance, **kwargs):
    agenda = instance.actor
    if isinstance(agenda, Agenda):
        agenda.num_followers = Follow.objects.filter(
            content_type = ContentType.objects.get(
                    app_label="agendas",
                    model="agenda").id,
            object_id=agenda.id).count()
        agenda.save()

post_delete.connect(update_num_followers, sender=Follow)
post_save.connect(update_num_followers, sender=Follow)
