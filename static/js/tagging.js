window.tags = {
	init : function(data) {
		this._model.init(data['csrf'], data['app_label'], data['object_type'], data['object_id']);
	},
	edit : function() {
		this._view.edit();
	},
	doneEdit : function() {
		this._view.doneEdit();
	},
	add : function(name) {
		var _this = this;
		if (name === undefined)
			name = _this._view.getAddTagName();
		if (name.length > 0 && _this._view.lock()) {
			_this._model.addByName(name, function(tmp, id, name) {
				if (tmp === true) {
					_this._view.add(name, id);
					_this._view.clearAddTagName();
				} else {
					_this._view.error(tmp, _this._model.getObjectType(), _this._model.getObjectId(), _this._model.getAppLabel());
				};
				_this._view.unlock();
			}, function(id) {
				return _this._view.isTagIdExists(id);
			});
		};
	},
	del : function(id) {
		var _this = this;
		if (_this._view.lock()) {
			_this._model.del(id, function(tmp) {
				if (tmp === true) {
					_this._view.del(id);
				} else {
					_this._view.error(tmp);
				};
				_this._view.unlock();
			});
		};
	},
	unDel : function(id) {
		var _this = this;
		if (_this._view.lock()) {
			_this._model.add(id, function(tmp) {
				if (tmp === true) {
					_this._view.unDel(id);
				} else {
					_this._view.error(tmp);
				};
				_this._view.unlock();
			});
		};
	},
	_model : {
		_getTagId : function(name, callback) {
			$.get('/api/v2/tag/', {
				'format' : 'json',
				'name' : name
			}, function(data) {
				if (data.objects.length != 1) {
					callback('TAG_DOES_NOT_EXIST');
				} else {
					callback(true, data.objects[0].id);
				};
			});
		},
		_getProperName : function(name) {
			matches = name.match(/\[(.*)\]$/);
			if (matches) {
				return matches[1];
			} else {
				return name;
			};
		},
		init : function(csrf, app_label, object_type, object_id) {
			this._csrf = csrf;
			this._app_label = app_label;
			this._object_type = object_type;
			this._object_id = object_id;
		},
		getObjectType : function() {
			return this._object_type;
		},
		getObjectId : function() {
			return this._object_id;
		},
		getAppLabel : function() {
			return this._app_label;
		},
		del : function(id, callback) {
			$.post("/tags/" + this._app_label + "/" + this._object_type + "/" + this._object_id + "/remove-tag/", {
				tag_id : id,
				csrfmiddlewaretoken : this._csrf
			}, function(data) {
				callback(true);
			});
		},
		add : function(id, callback) {
			$.post("/tags/" + this._app_label + "/" + this._object_type + "/" + this._object_id + "/add-tag/", {
				tag_id : id,
				csrfmiddlewaretoken : this._csrf
			}, function(data) {
				callback(true);
			});

		},
		addByName : function(name, callback, isTagIdExists) {
			var self = this;
			name = this._getProperName(name)
			this._getTagId(name, function(tmp, id) {
				if (tmp === true) {
					if (isTagIdExists(id)) {
						callback('TAG_ALREADY_ATTACHED');
					} else {
						self.add(id, function(tmp) {
							callback(tmp, id, name);
						});
					};
				} else {
					callback(tmp);
				};
			});
		}
	},
	_view : {
		_errorMsgs : {
			TAG_DOES_NOT_EXIST : gettext('the specified tag name does not exist and you do not have permission to add new tag names, only to attach existing tags'),
			TAG_ALREADY_ATTACHED : gettext('tag is already attached to current object')
		},
		_onDelButtonClick : function(elt) {
			if ($(elt).data('isDeleted') == 'yes') {
				tags.unDel($(elt).data('tagid'));
			} else {
				tags.del($(elt).data('tagid'));
			};
		},
		isTagIdExists : function(id) {
			return ($('#tag_' + id).length > 0);
		},
		lock : function() {
			this.clearError();
			$("body").css("cursor", "wait");
			$('.tagdelbutton').css('cursor', 'wait');
			$('.tag').css('cursor', 'wait');
			$('#tags_addnew a').css('cursor', 'wait');
			$('#tags_addnew input').css('cursor', 'wait');
			if (tags._viewLocked) {
				return false;
			} else {
				tags._viewLocked = true;
				return true;
			};
		},
		unlock : function() {
			tags._viewLocked = false;
			$("body").css("cursor", "default");
			$('.tagdelbutton').css('cursor', 'pointer');
			$('.tag').css('cursor', 'pointer');
			$('#tags_addnew a').css('cursor', 'pointer');
			$('#tags_addnew input').css('cursor', 'auto');
		},
		getAddTagName : function() {
			return $('#tags_addnew input').val();
		},
		getAddTagId : function() {
			var data = this._autocomplete.data;
			if (data.length == 1) {
				return data[0];
			} else {
				return false;
			};
		},
		clearAddTagName : function() {
			$('#tags_addnew input').val('');
		},
		add : function(name, id, href) {
			var html = '';
			html += '<a id="tag_' + id + '" class="tag label" style="cursor: pointer;"></a>';
			html += '<span style="cursor: pointer; color: red;" class="tagdelbutton" data-tagid="' + id + '" id="deltag_' + id + '">&nbsp;' + gettext('Delete') + '&nbsp;<br></span>';
			$('#tags').append(html);
			$('#tag_' + id).attr('href', '/tags/' + name + '/');
			$('#tag_' + id).text(name);
			var _this = this;
			$('#deltag_' + id).click(function() {
				_this._onDelButtonClick(this);
			});
		},
		edit : function() {
			var _this = this;
			if ($('.tagdelbutton').show().length == 0) {
				$('.tag').each(function() {
					var tagid = $(this).attr('id').split('_')[1]
					$(this).after('<span style="cursor:pointer;color:red;" class="tagdelbutton" data-tagid="' + tagid + '" id="deltag_' + tagid + '">&nbsp;' + gettext('Delete') + '&#160;<br/></span>');
				});
				$('.tagdelbutton').click(function() {
					_this._onDelButtonClick(this);
				});
				_this._autocomplete = $('#tags_addnew input').autocomplete({
					delimiter : ', ',
					serviceUrl : '/api/v2/tag/',
					params : {
						limit : 50,
						jquery_autocomplete : 1
					},
					paramName : 'name__startswith',
				});
				$('#tags_addnew input').on('keyup', function(e) {
					if (e.which == 13) {
						tags.add();
					};
				});
				$('#no-tags-yet').hide();
			};
			$('#tags_edit').hide();
			$('#tag_suggestions').show();
			$('#tags_doneedit').show();
			$('#tags_addnew').show();
		},
		doneEdit : function() {
			$('.tagdelbutton').hide();
			$('#tags_edit').show();
			$('#tag_suggestions').hide();
			$('#tags_doneedit').hide();
			$('#tags_addnew').hide();
			$('.tag').css({
				'text-decoration' : '',
				'background-color' : '',
				'color' : ''
			});
			$('.tagdelbutton').hide();
			$('.tagdelbutton').each(function() {
				if ($(this).data('isDeleted') == 'yes') {
					$(this).prev().remove();
					$(this).remove();
				};
			});
		},
		unDel : function(id) {
			$('#tag_' + id).css({
				'text-decoration' : '',
				'background-color' : '',
				'color' : ''
			});
			$('#deltag_' + id).html(gettext('Delete') + '<br/>');
			$('#deltag_' + id).data('isDeleted', 'no');
		},
		del : function(id) {
			$('#tag_' + id).css({
				'text-decoration' : 'line-through',
				'background-color' : '#dddddd',
				'color' : '#aaaaaa'
			});
			$('#deltag_' + id).html(gettext('Undo Delete') + '<br/>');
			$('#deltag_' + id).data('isDeleted', 'yes');
		},
		clearError : function() {
			$('#tags_notexist').hide();
		},
		error : function(code, object_type, object_id, app_label) {
			if (code == 'TAG_DOES_NOT_EXIST') {
				$('#tags_notexist').show();
				$('#suggest-tag-modal #id_name').val(this.getAddTagName());
				$('#suggest-tag-modal #id_object_type').val(object_type);
				$('#suggest-tag-modal #id_app_label').val(app_label);
				$('#suggest-tag-modal #id_object_id').val(object_id);
			} else {
				msg = this._errorMsgs[code];
				alert(msg);
			};
		}
	}
};

$(function() {
	$('body').on('click', 'a.tag-suggested', function() {
		tags.add($(this).data('tag'));
		$(this).remove();	
	});
});
