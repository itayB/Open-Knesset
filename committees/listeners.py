from django.db.models.signals import post_save,m2m_changed, pre_delete
from django.contrib.comments.signals import comment_was_posted
from django.contrib.comments.models import Comment
from django.contrib.contenttypes.models import ContentType
from planet.models import Feed, Post
from actstream import action, follow
from actstream.models import Action, Follow
from annotatetext.models import Annotation
from knesset.utils import disable_for_loaddata
from mks.models import Member
from models import CommitteeMeeting, Topic

cm_ct = None
member_ct = None
user_ct = None
annotation_ct = None

def get_ct():
    global cm_ct
    global member_ct
    global user_ct
    global annotation_ct
    cm_ct = ContentType.objects.get(app_label="committees", model="committeemeeting")
    member_ct = ContentType.objects.get(app_label="mks", model="member")
    user_ct = ContentType.objects.get(app_label="auth", model="user")
    annotation_ct = ContentType.objects.get(app_label="annotatetext", model="annotation")

@disable_for_loaddata
def handle_cm_save(sender, created, instance, **kwargs):
    if not cm_ct:
        get_ct()
    for m in instance.mks_attended.all():
        if Action.objects.filter(actor_object_id=m.id,
                                 actor_content_type=member_ct,
                                 verb='attended',
                                 target_object_id=instance.id,
                                 target_content_type=cm_ct).count()==0:
            action.send(m, verb='attended', target=instance, description='committee meeting', timestamp=instance.date)
post_save.connect(handle_cm_save, sender=CommitteeMeeting)

@disable_for_loaddata
def record_committee_presence(**kwargs):
    if not member_ct:
        get_ct()
    if kwargs['action'] != "post_add":
        return
    meeting = kwargs['instance']
    for mk_id in kwargs['pk_set']:
        m = Member.objects.get(pk=mk_id)
        if Action.objects.filter(actor_object_id=m.id,
                                 actor_content_type=member_ct,
                                 verb='attended',
                                 target_object_id=meeting.id,
                                 target_content_type=cm_ct).count()==0:
            action.send(m, verb='attended', target=meeting, description='committee meeting', timestamp=meeting.date)
m2m_changed.connect(record_committee_presence, sender=CommitteeMeeting.mks_attended.through)

@disable_for_loaddata
def handle_annotation_save(sender, created, instance, **kwargs):
    if created:
        if not cm_ct:
            get_ct()
        if Action.objects.filter(
                actor_object_id=instance.content_object.meeting.id,
                actor_content_type=cm_ct,
                verb='annotation-added',
                target_object_id=instance.id,
                target_content_type=annotation_ct).count()==0:
            action.send(instance.content_object.meeting, verb='annotation-added',
                        target=instance, description=unicode(instance.flag_value))
        if Action.objects.filter(
                actor_object_id=instance.user.id,
                actor_content_type=user_ct,
                verb='annotated',
                target_object_id=instance.id,
                target_content_type=annotation_ct).count()==0:
            action.send(instance.user, verb='annotated',
                        target=instance, description=unicode(instance.flag_value))

        if Follow.objects.filter(user=instance.user,
                                 object_id=instance.content_object.meeting.id,
                                 content_type=cm_ct)\
                         .count()==0:
            follow(instance.user, instance.content_object.meeting)
post_save.connect(handle_annotation_save, sender=Annotation)

@disable_for_loaddata
def handle_comment_save(sender, comment, request, **kwargs):
    action.send(comment.content_object, verb='comment-added', target=comment,
            description=comment.comment)
    follow(request.user, comment.content_object)
comment_was_posted.connect(handle_comment_save)

def delete_related_activities(sender, instance, **kwargs):
    Action.objects.filter(target_object_id=instance.id, verb__in=('annotated', 'comment-added')).delete()
pre_delete.connect(delete_related_activities, sender=Annotation)
pre_delete.connect(delete_related_activities, sender=Comment)
