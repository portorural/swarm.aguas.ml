/* global document */
/* global jQuery */
/* global uploader */
/* global snax */
/* global alert */
/* global confirm */
/* global plupload */
/* global snaxDemoItemsConfig */
/* global fabric */
/* global snax_quizzes */
/* global snax_polls */
/* global snax_front_submission_config */

snax.frontendSubmission = {};

(function ($, ctx) {

    'use strict';

    // Load config.
    ctx.config = $.parseJSON(window.snax_front_submission_config);

    // Init components.
    $(document).ready(function() {
        ctx.form.init();
        ctx.tabs.init();
        ctx.uploadMedia.init();
        ctx.uploadFeaturedImage.init();
        ctx.uploadDemoImages.init();
        ctx.uploadTextItems.init();
        ctx.uploadEmbeds.init();
        ctx.cards.init();
        ctx.memeGenerator.init();
        ctx.quiz.init();
        ctx.poll.init();
        ctx.memeTemplates.init();
    });

})(jQuery, snax.frontendSubmission);


/*******************
 *
 * Component: Form
 *
 ******************/

(function ($, ctx) {

    'use strict';

    /** CONFIG *******************************************/

    // Register new component.
    ctx.form = {};

    // Component namespace shortcut.
    var c = ctx.form;

    // CSS selectors.
    var selectors = {
        'post':             '.snax-form-frontend',
        'item':             '.snax-object, .snax-card',
        'postTitle':        '#snax-post-title',
        'postTags':         'input#snax-post-tags',
        'postCategory':     'select#snax-post-category',
        'postDescription':  'textarea#snax-post-description',
        'cardDescription':  '.snax-card-description textarea',
        'postHasSource':    'input#snax-post-has-source',
        'postSource':       'input#snax-post-source',
        'postHasRefLink':   'input#snax-post-has-ref-link',
        'postRefLink':      'input#snax-post-ref-link',
        'postLegal':        'input#snax-post-legal',
        'postContentTitle': '#snax-post-title-editable',
        'postContentEditor':'textarea.snax-content-editor',
        'insertButton':     '.snax-form-frontend .snax-insert-button',
        'mediaForm':        '.snax-edit-post-row-media',
        'featuredImage':    '#snax-featured-image',
        'postThumbnail':    '.attachment-post-thumbnail',
        'postContentTitleWrapper':  '.snax-edit-post-row-title',
        'publishPostButton':'.snax-button-publish-post',
        'previewPostButton':'.snax-button-preview',
        'cancelButton':     '.snax-cancel-submission'
    };

    var classes = {
        'postWithoutItems':     '.snax-form-without-items',
        'validationError':      'snax-validation-error',
        'froalaSimpleEditor':   'froala-editor-simple',
        'keepDemoData'      :   'snax-keep-demo-data'
    };

    var i18n = {
        'confirm':                  ctx.config.i18n.are_you_sure,
        'no_featured_uploaded':     ctx.config.i18n.no_featured_uploaded,
        'no_files_chosen':          ctx.config.i18n.no_files_chosen,
        'meme_generation_failed':   ctx.config.i18n.meme_generation_failed
    };

    // Allow accessing
    c.selectors = selectors;
    c.classes   = classes;
    c.i18n      = i18n;

    /** INIT *******************************************/

    c.init = function () {
        c.attachEventHandlers();
    };

    /** EVENTS *****************************************/

    c.attachEventHandlers = function() {
        c.validateForm();
        c.focusOnTitle();
        c.categoryRequirement();
        c.applyTagIt();
        c.clearDemoDataOnPageLoaded();
        c.previewPost();
        c.cancel();

    };

    c.clearDemoDataOnPageLoaded = function() {
        var $post = $(selectors.post);

        // Clear only if post has media.
        if (!$post.is('.snax-form-frontend-without-media') && !$post.hasClass('snax-form-frontend-edit-mode') && $post.find('.snax-demo-format').is(':visible')) {
            c.emptyFields();
        }
    };

    c.clearDemoDataOnMediaUploaded = function() {
        var $post = $(selectors.post);

        if (!$post.hasClass('snax-keep-demo-data') && !$post.hasClass('snax-form-frontend-edit-mode') && $post.find('.snax-demo-format').is(':visible')) {
            ctx.form.emptyFields();
        }
    };

    c.previewPost = function () {
        $(selectors.previewPostButton).on('click', function(e) {
            e.preventDefault();

            var url = $(this).attr('data-snax-preview-url');

            if (url) {
                window.open(url, '_blank');
            }
        });
    };

    c.cancel = function () {
        $(selectors.cancelButton).on('click', function(e) {
            e.preventDefault();

            var url = $(this).attr('href');
            console.log($(this).attr('data-snax-cancel-nonce'));
            var xhr = $.ajax({
                'type': 'GET',
                'url': snax.config.ajax_url,
                'dataType': 'json',
                'data': {
                    'action':       'snax_cancel_submission',
                    'snax-cancel':   $(this).attr('data-snax-cancel-nonce')
                }
            });

            xhr.done(function (res) {
                window.location.href = url;
            });

        });
    };

    c.categoryRequirement = function() {
        $(selectors.postCategory).on('change', function() {
            var $select = $(this);
            var current = parseInt($select.val(), 10);

            if (-1 !== current) {
                $select.parents('.snax-edit-post-row-categories').removeClass(classes.validationError);
            }
        });
    };

    c.validateForm = function() {
        var $form = $(selectors.post);

        // Save as Draft.
        $form.find('input[name=snax-save-draft]').on('click', function() {
            // When we stop default form processing, eg. to save cards via ajax, we need to resubmit it again afterwards.
            // We do this programmatically so the "Save Draft" submit input WILL NOT be attached to the request (only clicked submits, during normal flow, are sent).
            // We need to send information about type of request (save as draft in this case) using hidden input.

            // Check if hidden input is already there and remove it.
            $form.find('input[type=hidden]#snax-submit-type').remove();

            // Create new one.
            $form.append('<input type="hidden" id="snax-submit-type" name="snax-save-draft" value="standard" />');
        });

        $form.on('submit', function(e) {
            var $wrapper = $(this);

            // Check if title is filled.
            var $postTitle = $(selectors.postTitle);

            if ($postTitle.val().length === 0) {
                var $postContentTitle = $(selectors.postContentTitle);  // Content editable elements (H1).

                // Content editable field exists and it's empty.
                if ($postContentTitle.length > 0 && $postContentTitle.text().length === 0) {
                    $(selectors.postContentTitleWrapper).addClass(classes.validationError);

                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                } else {
                    $postTitle.val($postContentTitle.text());
                }
            }

            var $featuredImageContainer = $(selectors.featuredImage);

            if (ctx.config.featured_media_required && $featuredImageContainer.length > 0) {
                    var $featuredImage = $featuredImageContainer.find(selectors.postThumbnail);
                    var valid          = $featuredImage.length > 0;

                    if (!valid) {
                        var errorMessage = i18n.no_featured_uploaded;

                        alert(errorMessage);

                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        return false;
                    }
            }

            // Check if format requires items.
            if ( ! $wrapper.is(classes.postWithoutItems) ) {
                var $items = $wrapper.find(selectors.item);
                var valid  = $items.length > 0;

                if (!valid) {
                    var errorMessage = i18n.no_files_chosen;

                    alert(errorMessage);

                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
            }

            // Check if category selected.
            var $categoryWrapper = $('.snax-edit-post-row-categories');

            if ($categoryWrapper.is('.snax-field-required')) {
                var catInvalid = false;

                // Check if selected.
                var cat = $(selectors.postCategory).val();

                if ($.isArray(cat)) {
                    // Nothing selected.
                    if (0 === cat.length) {
                        catInvalid = true;
                    }

                    // One selected but it's empty choice.
                    if (1 === cat.length && -1 !== cat.indexOf('-1')) {
                        catInvalid = true;
                    }
                } else {
                    cat = parseInt($(selectors.postCategory).val(), 10);

                    if (!cat || cat <= 0) {
                        catInvalid = true;
                    }
                }

                // Not valid.
                if (catInvalid) {
                    $categoryWrapper.addClass(classes.validationError);

                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }
            }

            // Meme format.
            if ($wrapper.is('.snax-form-frontend-format-meme')) {
                var base64image = ctx.memeGenerator.getImageBase64();

                if (!base64image) {
                    alert(i18n.meme_generation_failed);
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    return false;
                }

                var $memeImage = $('<textarea id="snax-post-meme" name="snax-post-meme" ></textarea>');
                $memeImage.val(base64image);
                $memeImage.hide();

                $wrapper.prepend($memeImage);
            }

            // All is ok, we can process submission.
            $(selectors.publishPostButton).attr( 'disabled', 'disabled' );
        });
    };

    c.focusOnTitle = function () {

        $(selectors.postTitle).each(function() {
            var $title = $(this);

            if ($title.is(':visible') && $title.val().length === 0 && !$title.is('.snax-focused')) {
                $title.focus();
                $title.addClass('snax-focused');
            }
        });
    };

    c.applyTagIt = function () {

        // Check if jQuery script is loaded.
        if (!$.fn.tagit) {
            return;
        }

        $(selectors.postTags).each(function() {
            var $input = $(this);

            var tagsLimit = parseInt(ctx.config.tags_limit, 10);

            var config = {
                'singleField':      true,
                'allowSpaces':      true,
                'tagLimit':         tagsLimit || 10,
                'placeholderText':  $input.prop('placeholder'),
                // Auto-loaded list of tags.
                'availableTags':    ctx.config.tags,
                'autocomplete':     {
                    'appendTo':   '.snax-autocomplete',
                    'position':     {
                        'my':       'left top',
                        'of':       '.snax-autocomplete'
                    },
                    'delay':      0,
                    'minLength':  1
                },
                showAutocompleteOnFocus: true
            };

            // Use ajax to load tags.
            if (ctx.config.tags_force_ajax || ctx.config.tags.length === 0) {
                config.autocomplete.delay = 500;
                config.autocomplete.minLength = 2;
                config.autocomplete.source = function(request, response) {
                    var xhr = $.ajax({
                        'type': 'GET',
                        'url': snax.config.ajax_url,
                        'dataType': 'json',
                        'data': {
                            'action':       'snax_get_tags',
                            'snax_term':    request.term
                        }
                    });

                    xhr.done(function (res) {
                        if (res.status === 'success') {
                            response(res.args.tags);
                        }
                    });
                };
            }

            if (typeof c.tagitConfig === 'function') {
                config = c.tagitConfig(config);
            }

            /*
             Change tagIt condig via child theme modifications.js:
             -----------------------------------------------------

             $.ui.keyCode.COMMA = $.ui.keyCode.ENTER; // To prevent comma as a delimiter.

             // Way to override tagIt config. Here to change placeholder text only.
             snax.frontendSubmission.form.tagitConfig = function (config) {
                 config.placeholderText = 'Separate tags with Enter'

                 return config;
             };
             */

            $input.tagit(config);

            // Hide jQuery UI accessibility status.
            $('.ui-helper-hidden-accessible').hide();
        });

        $('ul.tagit').each(function() {
            var $this = $(this);

            $this.find( 'input[type=text]' )
                .on('focus', function() {
                    $this.addClass('tagit-focus');
                })
                .on('blur', function() {
                    $this.removeClass('tagit-focus');
                });
        });
    };

    c.emptyFields = function () {
        // Title.
        $(selectors.postTitle).val('');

        // Description.
        var $description = $(selectors.postDescription);

        if ($description.is('.froala-editor-simple')) {
            $description.froalaEditor('html.set', '');
        } else {
            $description.val('');
        }

        // Category.
        $(selectors.postCategory).find('option:selected').removeAttr('selected');

        // Tags.
        var $tagsInput = $(selectors.postTags);

        $tagsInput.val('');

        if ($.fn.tagit) {
            $tagsInput.tagit('removeAll');
        }

        // Source.
        $(selectors.postHasSource).removeAttr('checked');
        $(selectors.postSource).val('');

        // Referral link.
        $(selectors.postHasRefLink).removeAttr('checked');
        $(selectors.postRefLink).val('');

        // Legal.
        $(selectors.postLegal).removeAttr('checked');
    };

})(jQuery, snax.frontendSubmission);

/*******************
 *
 * Component: Tabs
 *
 ******************/

(function ($, ctx) {

    'use strict';

    /** CONFIG *******************************************/

        // Register new component.
    ctx.tabs = {};

    // Component namespace shortcut.
    var c = ctx.tabs;

    // CSS selectors.
    var selectors = {
        'tabsNav':              '.snax-tabs-nav',
        'tabsNavItem':          '.snax-tabs-nav-item',
        'tabsNavItemCurrent':   '.snax-tabs-nav-item-current',
        'tabContent':           '.snax-tab-content',
        'tabContentCurrent':    '.snax-tab-content-current',
        'focusableFields':      'input,textarea'
    };

    // CSS classes.
    var classes = {
        'tabsNavItemCurrent':   'snax-tabs-nav-item-current',
        'tabContentCurrent':    'snax-tab-content-current'
    };

    // Allow accessing
    c.selectors   = selectors;
    c.classes     = classes;

    /** INIT *******************************************/

    c.init = function () {
        c.attachEventHandlers();
    };

    /** EVENTS *****************************************/

    c.attachEventHandlers = function() {

        /* Switch tab */

        $(selectors.tabsNavItem).on('click', function(e) {
            e.preventDefault();

            var $tab = $(this);
            // Tabs nav and content muse be in the same div container.
            var $scope = $tab.parents(selectors.tabsNav).parents('.snax-edit-post-row-media');

            // Remove current selection.
            $(selectors.tabsNavItemCurrent, $scope).removeClass(classes.tabsNavItemCurrent);
            $(selectors.tabContentCurrent, $scope).removeClass(classes.tabContentCurrent);

            // Select current nav item.
            $tab.addClass(classes.tabsNavItemCurrent);

            // Select current content (with the same index as selected nav item).
            var navItemIndex = $(selectors.tabsNavItem, $scope).index($tab);

            var $tabContent = $(selectors.tabContent, $scope).eq(navItemIndex);

            $tabContent.addClass(classes.tabContentCurrent);

            // Focus first field.
            $tabContent.find(selectors.focusableFields).filter(':visible:first').focus();
        });

    };

})(jQuery, snax.frontendSubmission);


/************************************
 *
 * Component: Upload Format Image(s)
 *
 ***********************************/

(function ($, ctx) {

    'use strict';

    /** CONFIG *******************************************/

    // Register new component
    ctx.uploadMedia = {};

    // Component namespace shortcut
    var c = ctx.uploadMedia;

    // CSS selectors
    var selectors = {
        'post':                     '.snax-form-frontend',
        'postTitle':                '#snax-post-title',
        'parentFormat':             '.snax-form-frontend input[name=snax-post-format]',
        'form':                     '.snax-tab-content-image, .snax-tab-content-audio, .snax-tab-content-video',
        'formNav':                  '.snax-tabs-nav',
        'mediaForm':                '.snax-media-upload-form',
        // @todo
        'media':                    '.snax-card, .snax-image, .snax-audio, .snax-video',
        'mediaWrapper':             '.snax-cards, .snax-edit-post-row-image, .snax-edit-post-row-audio, .snax-edit-post-row-video',
        'mediaDelete':              '.snax-media-action-delete'
    };

    var classes = {
        'postWithoutMedia':     'snax-form-frontend-without-media',
        'postWithMedia':        'snax-form-frontend-with-media',
        'postWithRemovedMedia': 'snax-form-frontend-with-removed-media',
        'formHidden':           'snax-tab-content-hidden',
        'formVisible':          'snax-tab-content-visible',
        'formNavHidden':        'snax-tabs-nav-hidden',
        'formNavVisible':       'snax-tabs-nav-visible'
    };

    var i18n = {
        'confirm':              ctx.config.i18n.are_you_sure
    };

    // Allow overriding via child theme modifications.js.
    c.selectors = selectors;
    c.classes   = classes;
    c.i18n      = i18n;

    var parentFormat;

    /** INIT *******************************************/

    c.init = function () {
        var $forms = $(selectors.form);

        if ($forms.length === 0) {
            return;
        }

        if (snax.currentUserId === 0) {
            snax.log('Snax: User not logged in!');
            return;
        }

        parentFormat = $(selectors.parentFormat).val();

        if (parentFormat.length === 0) {
            snax.log('Snax Front Submission Error: Parent format not defined!');
            return;
        }

        $forms.each(function() {
            var $form       = $(this);
            var $mediaForm  = $form.find(selectors.mediaForm);

            if ($mediaForm.length === 0) {
                snax.log('Snax Front Submission Error: media form missing!');
                return;
            }

            c.handleMediaUpload($mediaForm);
        });

        // Common.
        c.handleMediaDelete();
        c.handleMediaDeleted();
    };

    c.handleMediaUpload = function($mediaForm) {
        $mediaForm.on('snaxFileUploaded', function(e, mediaId, data) {
            if (typeof c.fileUploadedCallback === 'function') {
                c.fileUploadedCallback(mediaId);
            } else {
                var type = $mediaForm.parents('.snax-upload').find('input[name=snax-media-item-type]').val();

                c.createMedia(mediaId, type, null, data);
            }
        });

        $mediaForm.on('snaxAfterSuccessfulUpload', function() {
            c.afterSuccessfulUpload();
        });
    };

    c.handleMediaDelete = function() {
        $(selectors.post).on('click', selectors.mediaDelete, function(e) {
            e.preventDefault();

            if (!confirm(i18n.confirm)) {
                return;
            }

            var $media = $(this).parents(selectors.media);

            c.deleteMedia($media);

            $(selectors.post).addClass( classes.postWithRemovedMedia );
        });
    };

    c.handleMediaDeleted = function() {
        $(selectors.form).on('snaxMediaRemoved', function() {
            var $form       = $(this);
            var $mediaForm  = $form.find(selectors.mediaForm);
            var uploader    = $mediaForm.data('snaxUploader');

            if ('meme' === parentFormat) {
                $('.snax-edit-post-row-media canvas, .snax-edit-post-row-media .canvas-container').remove();
            }

            // Allow uploading new image.
            if (uploader && !uploader.getOption('multi_selection')) {
                snaxPlupload.initQueue(uploader);
            }

            $(selectors.form).addClass(classes.formVisible).removeClass(classes.formHidden);
            $(selectors.formNav).addClass(classes.formNavVisible).removeClass(classes.formNavHidden);

            $(selectors.post).addClass(classes.postWithRemovedMedia).removeClass(classes.postWithoutMedia + ' ' + classes.postWithMedia);
        });
    };

    c.createMedia = function(id, type, callback, data) {
        callback = callback || function() {};
        data     = data || {};

        data = $.extend({
            'postId':       snax.currentPostId,
            'mediaId':      id,
            'authorId':     snax.currentUserId,
            'status':       'publish',
            'parentFormat': parentFormat,
            'legal':        true,
            'title':        '',
            'source':       '',
            'refLink':      '',
            'description':  '',
            'type':         type
        }, data);

        var item = snax.MediaItem(data);

        item.save(function(res) {
            if (res.status === 'success') {
                switch(parentFormat) {
                    case 'image':
                    case 'audio':
                    case 'video':
                    case 'meme':
                        c.loadMedia(res.args.item_id, type);
                        break;

                    default:
                        ctx.cards.addCard(res.args.item_id);
                }
            }

            callback(res);
        });
    };

    c.loadMedia = function(itemId, type) {
        var xhr = $.ajax({
            'type': 'GET',
            'url': snax.config.ajax_url,
            'dataType': 'json',
            'data': {
                'action':          'snax_load_media_item_tpl',
                'snax_item_id':    itemId,
                'snax_type':       type
            }
        });

        xhr.done(function (res) {
            if (res.status === 'success') {
                var $media = $(res.args.html);

                $(selectors.mediaWrapper).append($media);

                $(selectors.form).removeClass(classes.formVisible).addClass(classes.formHidden);
                $(selectors.formNav).removeClass(classes.formNavVisible).addClass(classes.formNavHidden);

                // Apply MEJS player.
                if ( typeof window.wp.mediaelement !== 'undefined' ) {
                    $( window.wp.mediaelement.initialize );
                }

                // @todo - MEME refactor
                setTimeout(function() {
                    ctx.memeGenerator.init();
                }, 500);
            }
        });
    };

    c.deleteMedia = function($media) {
        var $link = $media.find(selectors.mediaDelete);

        snax.deleteItem($link, function(res) {
            if (res.status === 'success') {
                $(selectors.form).trigger('snaxMediaRemoved',[$media]);

                $media.remove();
            }
        });
    };

    c.afterSuccessfulUpload = function () {
        ctx.form.clearDemoDataOnMediaUploaded();

        var $post = $(selectors.post);

        // Switch from "Init" form to "Full" form.
        if ($post.hasClass(classes.postWithoutMedia)) {
            $('body').trigger('snaxFullFormLoaded', [$post]);
        }

        $post.
            removeClass(classes.postWithoutMedia + ' ' + classes.postWithRemovedMedia).
            addClass(classes.postWithMedia);

        if (!$(selectors.post).is('.snax-form-frontend-edit-mode')) {
            var $postTitle = $(selectors.post).find(selectors.postTitle);

            // If title has no "snax-focused" class yet,
            // we can be sure that the form is loaded for the first time.
            // So we can perform some initial actions.
            if (!$postTitle.is('.snax-focused')) {
                $postTitle.addClass('snax-focused').focus();
            }
        }
    };

})(jQuery, snax.frontendSubmission);


/************************************
 *
 * Component: Upload Featured Image
 *
 ***********************************/

(function ($, ctx) {

    'use strict';

    /** CONFIG *******************************************/

    // Register new component
    ctx.uploadFeaturedImage = {};

    // Component namespace shortcut
    var c = ctx.uploadFeaturedImage;

    // CSS selectors
    var selectors = {
        'parentFormat':             '.snax-form-frontend input[name=snax-post-format]',
        'form':                     '.snax-tab-content-featured-image',
        'mediaForm':                '.snax-media-upload-form',
        'imageDelete':              '.snax-media-action-delete-featured',
        'featuredImage':            '#snax-featured-image'
    };

    var classes = {
        'formHidden':           'snax-tab-content-hidden',
        'formVisible':          'snax-tab-content-visible'
    };

    var i18n = {
        'confirm':              ctx.config.i18n.are_you_sure
    };

    // Allow overriding via child theme modifications.js.
    c.selectors = selectors;
    c.classes   = classes;
    c.i18n      = i18n;

    var $form;
    var $mediaForm;
    var parentFormat,
        postId;

    /** INIT *******************************************/

    c.init = function () {
        $form = $(selectors.form);

        if ($form.length === 0) {
            return;
        }

        if (snax.currentUserId === 0) {
            snax.log('Snax: User not logged in!');
            return;
        }

        parentFormat = $(selectors.parentFormat).val();

        if (parentFormat.length === 0) {
            snax.log('Snax Front Submission Error: Parent format not defined!');
            return;
        }

        $mediaForm  = $form.find(selectors.mediaForm);

        if ($mediaForm.length === 0) {
            snax.log('Snax Front Submission Error: media form missing!');
            return;
        }

        postId = $form.attr('data-snax-parent-post-id') ? parseInt($form.attr('data-snax-parent-post-id'), 10) : '';

        c.handleImageUpload();
        c.handleImageDelete();
    };

    c.handleImageUpload = function() {
        $mediaForm.on('snaxFileUploaded', function(e, mediaId) {
            c.createImage(mediaId);
        });
    };

    c.createImage = function(mediaId) {
        var xhr = $.ajax({
            'type': 'GET',
            'url': snax.config.ajax_url,
            'dataType': 'json',
            'data': {
                'action':               'snax_load_featured_image_tpl',
                'snax_media_id':        mediaId,
                'snax_parent_format':   parentFormat,
                'snax_post_id':         postId
            }
        });

        xhr.done(function (res) {
            if (res.status === 'success') {
                var $image = $(res.args.html);

                // Hide upload form.
                $(selectors.form).removeClass(classes.formVisible).addClass(classes.formHidden);

                // Load image.
                $(selectors.featuredImage).empty().append($image);
            }
        });
    };

    c.handleImageDelete = function() {
        $(selectors.featuredImage).on('click', selectors.imageDelete, function(e) {
            e.preventDefault();

            if ( !ctx.skipConfirmation ) {
                if (!confirm(i18n.confirm)) {
                    return;
                }
            }

            // Reset.
            ctx.skipConfirmation = false;

            c.deleteImage();
        });
    };

    c.deleteImage = function() {
        var $imageWrapper = $(selectors.featuredImage);
        var $link         = $imageWrapper.find(selectors.imageDelete);

        snax.deleteItem($link, function(res) {
            if (res.status === 'success') {
                $imageWrapper.empty();

                $(selectors.form).addClass(classes.formVisible).removeClass(classes.formHidden);
            }
        });
    };

})(jQuery, snax.frontendSubmission);


/********************************
 *
 * Component: Upload Demo Images
 *
 ********************************/

(function ($, ctx) {

    'use strict';

    /** CONFIG *******************************************/

        // Register new component
    ctx.uploadDemoImages = {};

    // Component namespace shortcut
    var c = ctx.uploadDemoImages;

    // CSS selectors
    var selectors = {
        'post':                     '.snax-form-frontend',
        'mediaForm':                '.snax-media-upload-form:first',
        'demoImagesWrapper':        '.snax-demo-format',
        'loadDemoImagesButton':     '.snax-demo-format-image > a, .snax-demo-format-images > a',
        'demoImages':               'img'
    };

    var classes = {
        keepDemoData:   'snax-keep-demo-data'
    };

    // Allow overriding via child theme modifications.js.
    c.selectors = selectors;
    c.classes   = classes;

    /** INIT *******************************************/

    c.init = function () {
        $(selectors.loadDemoImagesButton).on('click', function(e) {
            e.preventDefault();

            var $form       = $(this).parents(selectors.post);
            var $mediaForm  = $form.find(selectors.mediaForm);

            if ($mediaForm.length > 0) {
                var uploader    = $mediaForm.data('snaxUploader');

                $form.addClass(classes.keepDemoData);

                c.handleDemoUpload($form, $mediaForm, uploader);
            }
        });
    };

    c.handleDemoUpload = function($form, $mediaForm, uploader) {
        var $wrapper        = $form.find(selectors.demoImagesWrapper);
        var $images         = $wrapper.find(selectors.demoImages);
        var imagesCount     = $images.length;
        var filesAllList    = [];
        var filesAll        = 0;

        if (imagesCount === 0) {
            return;
        }

        $images.each(function() {
            var imageId = parseInt($(this).attr('data-snax-media-id'), 10);
            var fakeFile = {
                'id': imageId
            };

            filesAllList.push(fakeFile);
            filesAll++;
        });

        var uploadInterval = imagesCount === 1 ? 1000 : 700;

        var uploadFakeImage = function(index) {
            if (index === filesAll || filesAllList.length === 0) {
                return;
            }

            var fakeFile = filesAllList[index];

            var fakeFileData = {};

            if (typeof snaxDemoItemsConfig !== 'undefined' && snaxDemoItemsConfig[fakeFile.id]) {
                fakeFileData = snaxDemoItemsConfig[fakeFile.id];
            }

            snaxPlupload.fakeFileUploaded(fakeFile, fakeFile.id.toString(), $mediaForm, fakeFileData);

            setTimeout(function() {
                index++;
                uploadFakeImage(index);
            }, uploadInterval);
        };

        snaxPlupload.initFakeUpload($mediaForm, filesAllList);
        uploadFakeImage(0);
    };

})(jQuery, snax.frontendSubmission);

/********************************
 *
 * Component: Upload Text Items
 *
 ********************************/

(function ($, ctx) {

    'use strict';

    /** CONFIG *******************************************/

        // Register new component
    ctx.uploadTextItems = {};

    // Component namespace shortcut
    var c = ctx.uploadTextItems;

    // CSS selectors
    var selectors = {
        'post':                 '.snax-form-frontend',
        'postTitle':            '#snax-post-title',
        'itemTitle':            '.snax-text-item-title',
        'itemTitleWrapper':     '.snax-new-text-item-title',
        'itemDescription':      '.snax-text-item-description',
        'parentFormat':         '.snax-form-frontend input[name=snax-post-format]',
        'form':                 '.snax-tab-content-text',
        'addButton':            '.snax-add-text-item'
    };

    var classes = {
        'postWithoutMedia':     'snax-form-frontend-without-media',
        'postWithMedia':        'snax-form-frontend-with-media',
        'postWithRemovedMedia': 'snax-form-frontend-with-removed-media'
    };

    // Allow overriding via child theme modifications.js.
    c.selectors = selectors;
    c.classes   = classes;

    var $forms;
    var parentFormat;

    /** INIT *******************************************/

    c.init = function () {
        $forms = $(selectors.form);

        if (!$forms.length) {
            return;
        }

        parentFormat = $(selectors.parentFormat).val();

        if (parentFormat.length === 0) {
            snax.log('Snax Front Submission Error: Parent format not defined!');
            return;
        }

        if (snax.currentUserId === 0) {
            snax.log('Snax: Login required');
            return;
        }

        $forms.each(function() {
            var $form = $(this);

            c.attachEventHandlers($form);
        });
    };

    c.attachEventHandlers = function($form) {
        $form.find(selectors.itemTitle).on('keydown', function(e) {
            if (13 === e.keyCode) {
                e.preventDefault();

                c.processSubmission($form);
            }
        });

        $form.find(selectors.addButton).on('click', function(e) {
            e.preventDefault();

            c.processSubmission($form);
        });
    };

    c.processSubmission = function($form) {
        var $title = $form.find(selectors.itemTitle);
        var $titleWrapper = $title.parents(selectors.itemTitleWrapper);
        var title = $.trim($title.val());

        // Reset.
        $titleWrapper.removeClass('snax-validation-error');

        if (title.length > 0 && title.length < $title.attr('maxlength')) {
            var $description = $form.find(selectors.itemDescription);
            var description  = $.trim($description.val());

            c.addTextItem(title, description);

            $title.val('');
            $description.val('');
        } else {
            $titleWrapper.addClass('snax-validation-error');
        }
    };

    c.addTextItem = function(title, description) {
        var item = snax.TextItem({
            'title':        title,
            'description':  description,
            'authorId':     snax.currentUserId,
            'status':       'publish',
            'parentFormat': parentFormat,
            'legal':        true
        });

        item.save(function(res) {
            if (res.status === 'success') {
                ctx.cards.addCard(res.args.item_id);

                c.afterSuccessfulUpload();
            }
        });
    };

    c.afterSuccessfulUpload = function () {
        ctx.form.clearDemoDataOnMediaUploaded();

        var $post = $(selectors.post);

        // Switch from "Init" form to "Full" form.
        if ($post.hasClass(classes.postWithoutMedia)) {
            $('body').trigger('snaxFullFormLoaded', [$post]);
        }

        $post.
            removeClass(classes.postWithoutMedia + ' ' + classes.postWithRemovedMedia).
            addClass(classes.postWithMedia);

        if (!$(selectors.post).is('.snax-form-frontend-edit-mode')) {
            var $postTitle = $(selectors.post).find(selectors.postTitle);

            // If title has no "snax-focused" class yet,
            // we can be sure that the form is loaded for the first time.
            // So we can perform some initial actions.
            if (!$postTitle.is('.snax-focused')) {
                $postTitle.addClass('snax-focused').focus();
            }
        }
    };

})(jQuery, snax.frontendSubmission);


/**************************
 *
 * Component: Upload Embeds
 *
 *************************/

(function ($, ctx) {

    'use strict';

    /** CONFIG *******************************************/

        // Register new component
    ctx.uploadEmbeds = {};

    // Component namespace shortcut
    var c = ctx.uploadEmbeds;

    // CSS selectors
    var selectors = {
        'post':                 '.snax-form-frontend',
        'postTitle':            '#snax-post-title',
        'parentFormat':         '.snax-form-frontend input[name=snax-post-format]',
        'form':                 '.snax-tab-content-embed, .snax-tab-content-video, .snax-tab-content-audio',
        'formNav':              '.snax-tabs-nav',
        'embedUrlsField':       '.snax-embed-url-multi',
        'embedUrlField':        '.snax-embed-url',
        'removeEmbedUrlLink':   '.snax-remove-embed',
        'submitField':          '.snax-add-embed-item',
        'embed':                '.snax-card, .snax-embed',
        'embedsWrapper':        '.snax-cards',
        'embedDelete':          '.snax-embed-action-delete',
        'loadDemoEmbedButton':  '.snax-demo-format-embed > a',
        // Embeds processing.
        'embedProcessing':      '.snax-xofy-x',
        'embedsAll':            '.snax-xofy-y',
        'embedsProgressBar':    '.snax-progress-bar',
        'embedState':           '.snax-state',
        'embedsStates':         '.snax-states',
        'statesWrapper':        '.snax-details'
    };

    // CSS classes
    var classes = {
        'embedUrlField':        'snax-embed-url',
        'removeEmbedUrlLink':   'snax-remove-embed',
        'fieldValidationError': 'snax-error',
        'formHidden':           'snax-tab-content-hidden',
        'formVisible':          'snax-tab-content-visible',
        'formNavHidden':        'snax-tabs-nav-hidden',
        'formNavVisible':       'snax-tabs-nav-visible',
        'postWithoutMedia':     'snax-form-frontend-without-media',
        'postWithMedia':        'snax-form-frontend-with-media',
        'postWithRemovedMedia': 'snax-form-frontend-with-removed-media',
        // Embeds processing.
        'embedState':            'snax-state',
        'embedStateProcessing':  'snax-state-processing',
        'embedStateSuccess':     'snax-state-success',
        'embedStateError':       'snax-state-error',
        'embedProcessed':        'snax-details-expanded',
        'keepDemoData':          'snax-keep-demo-data'
    };

    // i18n.
    var i18n = {
        'confirm':      ctx.config.i18n.are_you_sure
    };

    c.selectors = selectors;
    c.classes   = classes;
    c.i18n      = i18n;

    var $forms,
        parentFormat,
        $embedsAll,
        $embedProcessing,
        $embedsProgressBar,
        $embedsStates,
        embedsAll,
        embedProcessing,
        embedsUploaded,
        embedsFailed,
        embedErrors,
        embedStates;                    // States of processed files. Format: [ { name: 1.jpg, state: 1 }, ... ].
                                        // States: 1 (success),  -1 (error), file not in array (not processed yet).

    /** INIT *******************************************/

    c.init = function () {
        $forms = $(selectors.form);

        if (!$forms.length) {
            return;
        }

        parentFormat = $(selectors.parentFormat).val();

        if (parentFormat.length === 0) {
            snax.log('Snax Front Submission Error: Parent format not defined!');
            return;
        }

        if (snax.currentUserId === 0) {
            snax.log('Snax: Login required');
            return;
        }

        $forms.each(function() {
            var $form = $(this);

            c.attachEventHandlers($form);
        });
    };

    /** EVENTS *****************************************/

    c.attachEventHandlers = function($form) {

        /* New url pasted */

        $form.on('paste drop', selectors.embedUrlsField, function() {
            // Delay to make sure that we can read from the field.
            setTimeout(function () {
                $form.find(selectors.submitField).trigger('click');
            }, 200);
        });

        /* New url typed */

        $form.find(selectors.embedUrlsField).on('focusout', function() {
            if($(this).val().length > 0) {
                $(selectors.submitField).trigger('click');
            }
        });

        /* Submit url */

        $form.find(selectors.submitField).on('click', function(e) {
            e.preventDefault();
            // Collect embed codes.
            var $urls = $form.find(selectors.embedUrlsField);
            if ($('.snax-edit-post-row-media-bottom .snax-embed-url').val()) {
                $urls = $('.snax-edit-post-row-media-bottom .snax-embed-url');
            }

            var urlsString = $.trim($urls.val());

            var urls = urlsString.split(/\r|\n/);

            // Strip to one embed.
            if (urls.length > 1 && -1 !== $.inArray(parentFormat, ['embed'])) {
                var firstUrl = urls[0];

                // Reset array.
                urls = [ firstUrl ];
            }

            // Clear field.
            $urls.val('');

            // Validate if at least entered.
            if (urls.length === 0) {
                $(selectors.embedUrlsField).addClass(classes.fieldValidationError);
                return;
            } else {
                $(selectors.embedUrlsField).removeClass(classes.fieldValidationError);
            }

            c.initFeedback(urls.length);

            urls.reverse();

            c.addEmbedUrls(urls);
        });

        /** Delete ***************/

        $(selectors.embedsWrapper).on('click', selectors.embedDelete, function(e) {
            e.preventDefault();

            if (!confirm(i18n.confirm)) {
                return;
            }

            var $embed = $(this).parents(selectors.embed);

            c.deleteEmbed($embed);
        });

        /** Upload demo embed *******/

        $(selectors.loadDemoEmbedButton).on('click', function(e) {
            e.preventDefault();

            var urls = [
                $(this).attr('href')
            ];

            $(selectors.post).addClass(classes.keepDemoData);

            // Fake uploading process.
            c.initFeedback(1);

            c.addEmbedUrls(urls);
        });
    };

    /** API *********************************************/

    c.addEmbedUrls = function(urls) {
        if (urls.length === 0) {
            c.uploadFinished();
            return;
        }

        var url = urls.pop();

        if (url === '') {
            c.uploadFinished();
            return;
        }

        if ('text' === parentFormat) {
            c.addContentEmbed(url);

            c.embedProcessed(1);

            // Process next url.
            c.addEmbedUrls(urls);
        } else {
            var item = snax.EmbedItem({
                'embedCode':    url,
                'authorId':     snax.currentUserId,
                'status':       'publish',
                'parentFormat': parentFormat,
                'legal':        true
            });

            item.save(function(res) {
                if (res.status === 'success') {
                    switch(parentFormat) {
                        case 'embed':
                        case 'video':
                        case 'audio':
                            c.addEmbed(res.args.item_id);
                            if ( res.args.thumbnail ) {
                                $('.snax-tab-content-featured-image .snax-media-upload-form').trigger('snaxFileUploaded', [ res.args.thumbnail ]);
                            }
                            break;

                        default:
                            ctx.cards.addCard(res.args.item_id);
                    }

                    c.embedProcessed(1);
                } else {
                    c.embedProcessed(-1, res.message);
                }

                // Process next url.
                c.addEmbedUrls(urls);
            });
        }
    };

    c.embedProcessed = function(status, errorMsg) {
        embedStates[embedProcessing - 1] = status;

        if (status === -1) {
            embedsFailed++;
            embedErrors[embedProcessing - 1] = errorMsg;
        }

        // Update feedback.
        embedProcessing++;
        embedsUploaded++;

        c.updateFeedback();
    };

    c.addEmbed = function(itemId) {
        var xhr = $.ajax({
            'type': 'GET',
            'url': snax.config.ajax_url,
            'dataType': 'json',
            'data': {
                'action':          'snax_load_embed_item_tpl',
                'snax_item_id':    itemId
            }
        });

        xhr.done(function (res) {
            if (res.status === 'success') {
                var $embed = $(res.args.html);
                var $embedTitle = res.args.embed_title;

                $('body').trigger( 'snaxBeforeAddingEmbed', [ $embed ] );

                $(selectors.embedsWrapper).append($embed);
                $(selectors.postTitle).val($embedTitle);

                $(selectors.form).removeClass(classes.formVisible).addClass(classes.formHidden);
                $(selectors.formNav).removeClass(classes.formNavVisible).addClass(classes.formNavHidden);
            }
        });
    };

    c.addContentEmbed = function(url) {
        var xhr = $.ajax({
            'type': 'POST',
            'url': snax.config.ajax_url,
            'dataType': 'json',
            'data': {
                'action':           'snax_load_content_embed_tpl',
                'snax_embed_code':  url
            }
        });

        xhr.done(function (res) {
            if (res.status === 'success') {
                var $embed = $(res.args.html);

                $('body').trigger('snaxContentEmbedAdded',[$embed]);
            } else {
                alert(res.message);
            }
        });
    };

    c.deleteEmbed = function($embed) {
        var $link       = $embed.find(selectors.embedDelete);

        snax.deleteItem($link, function(res) {
            if (res.status === 'success') {
                $embed.trigger('snaxEmbedRemoved',[$embed]);

                $embed.remove();

                $(selectors.form).addClass(classes.formVisible).removeClass(classes.formHidden);
                $(selectors.formNav).addClass(classes.formNavVisible).removeClass(classes.formNavHidden);

                $(selectors.post).addClass(classes.postWithRemovedMedia).removeClass(classes.postWithoutMedia + ' ' + classes.postWithMedia);
            }
        });
    };

    c.initFeedback = function(all) {
        // Init.
        embedProcessing = 1;
        embedsUploaded  = 0;
        embedsAll       = all;
        embedStates     = [];
        embedErrors     = [];
        embedsFailed    = 0;

        $embedProcessing    = $(selectors.embedProcessing);
        $embedsAll          = $(selectors.embedsAll);
        $embedsProgressBar  = $(selectors.embedsProgressBar);
        $embedsStates       = $(selectors.embedsStates);

        $embedProcessing.text(embedProcessing);
        $embedsAll.text(embedsAll);
        $embedsProgressBar.css('width', 0);

        // Reset states.
        var i;
        $embedsStates.empty();

        for(i = 0; i < embedsAll; i++) {
            $embedsStates.append('<li class="'+ classes.embedState +'"></li>');
        }

        $(selectors.statesWrapper).removeClass(classes.embedProcessed);

        snax.displayFeedback('processing-files');
    };

    c.updateFeedback = function() {
        var currentIndex = embedsUploaded - 1;
        var currentState = typeof embedStates[currentIndex] !== 'undefined' ? embedStates[currentIndex] : 0;

        var $embedState = $(selectors.embedsStates).find(selectors.embedState).eq(currentIndex);

        $embedState.addClass(classes.embedStateProcessing);

        if (currentState !== 0) {
            $embedState.
                removeClass(classes.embedStateProcessing).
                addClass(currentState === 1 ? classes.embedStateSuccess : classes.embedStateError);

            if (currentState === -1) {
                var errorMessage = embedErrors[currentIndex];

                $embedState.text(errorMessage);
            }

            var progress = embedsUploaded / embedsAll * 100;

            $embedProcessing.text(embedsUploaded);
            $embedsProgressBar.css('width', progress + '%');
        }
    };

    c.uploadFinished = function() {
        var finished = embedsUploaded === embedsAll;

        if (finished) {
            if (embedsFailed > 0) {
                $(selectors.statesWrapper).addClass(classes.embedProcessed);
            } else {
                setTimeout(function() {
                    ctx.form.clearDemoDataOnMediaUploaded();

                    var $post = $(selectors.post);

                    // Switch from "Init" form to "Full" form.
                    if ($post.hasClass(classes.postWithoutMedia)) {
                        $('body').trigger('snaxFullFormLoaded', [$post]);
                    }

                    $post.removeClass(classes.postWithoutMedia + ' ' + classes.postWithRemovedMedia).addClass(classes.postWithMedia);

                    if (!$post.is('.snax-form-frontend-edit-mode')) {
                        var $postTitle = $(selectors.post).find(selectors.postTitle);

                        // If title has no "snax-focused" class yet,
                        // we can be sure that the form is loaded for the first time.
                        // So we can perform some initial actions.
                        if (!$postTitle.is('.snax-focused')) {
                            // Focus on title.
                            $postTitle.addClass('snax-focused').focus();
                        }
                    }

                    snax.hideFeedback();
                }, 750);
            }
        }

        return finished;
    };

})(jQuery, snax.frontendSubmission);


/********************
 *
 * Component: Cards
 *
 *******************/

(function ($, ctx) {

    'use strict';

    /** CONFIG *******************************************/

    // Register new component
    ctx.cards = {};

    // Component namespace shortcut
    var c = ctx.cards;

    // CSS selectors
    var selectors = {
        'form':             'form.snax-form-frontend',
        'focusableFields':  'input,textarea',
        'card':             '.snax-card',
        'titleField':       'input[name=snax-title]',
        'hasSourceField':   'input[name=snax-has-source]',
        'sourceField':      'input[name=snax-source]',
        'hasRefLinkField':  'input[name=snax-has-ref-link]',
        'refLinkField':     'input[name=snax-ref-link]',
        'descriptionField': '.snax-card-description > textarea',
        'focusedCard':      '.snax-card-focus',
        'blurredCard':      '.snax-card-blur',
        'cardUp':           '.snax-card-up',
        'cardDown':         '.snax-card-down',
        'cardDelete':       '.snax-card-action-delete',
        'cardPosition':     '.snax-card-position',
        'newEmbeds':        '.snax-new-embeds',
        'addEmbedsField':   'textarea.snax-add-embed-urls',
        'cardsWrapper':     '.snax-cards',
        'publishPostButton':'.snax-button-publish-post',
        'limitReachedNote': '.snax-limit-edit-post-items'
    };


    // CSS classes
    var classes = {
        'focusedCard':      'snax-card-focus',
        'blurredCard':      'snax-card-blur',
        'saving':           'snax-saving',
        'saveFailed':       'snax-save-failed',
        'noteOn':           'snax-note-on',
        'noteOff':          'snax-note-off'
    };

    // i18n.
    var i18n = {
        'confirm':      ctx.config.i18n.are_you_sure
    };

    c.selectors = selectors;
    c.classes   = classes;
    c.i18n      = i18n;

    var $form,
        cardsLimit,
        cardsCount;

    /** INIT *******************************************/

    c.init = function () {
        $form = $(selectors.form);

        if (!$form.length) {
            return;
        }

        cardsCount = parseInt($form.find(selectors.card).length, 10);
        cardsLimit = parseInt(ctx.config.items_limit, 10);

        c.checkLimits();
        c.attachEventHandlers();
        c.scheduleTasks();
    };

    /** EVENTS *****************************************/

    c.attachEventHandlers = function() {

        /** Focus *********************/

        $(selectors.cardsWrapper).on( 'focus', selectors.focusableFields, function() {
            var $card = $(this).parents(selectors.card);

            // Only if current card is not focused.
            if ( ! $card.is( selectors.focusedCard ) ) {
                // Blur all focused cards.
                $(selectors.focusedCard).toggleClass(classes.blurredCard + ' ' + classes.focusedCard);

                // Focus current.
                $card.toggleClass(classes.blurredCard + ' ' + classes.focusedCard);
            }
        } );

        /** Move up/down **************/

        $(selectors.cardsWrapper).on('click', selectors.cardUp, function(e) {
            e.preventDefault();

            var $card = $(this).parents(selectors.card);

            c.moveCard($card, -1);
        });

        $(selectors.cardsWrapper).on('click', selectors.cardDown, function(e) {
            e.preventDefault();

            var $card = $(this).parents(selectors.card);

            c.moveCard($card, 1);
        });

        /** Delete ***************/

        $(selectors.cardsWrapper).on('click', selectors.cardDelete, function(e) {
            e.preventDefault();

            if (!confirm(i18n.confirm)) {
                return;
            }

            var $card = $(this).parents(selectors.card);

            c.deleteCard($card);
        });

        /** Save post ************/

        var submitFormHandler = function() {
            var $button = $(selectors.publishPostButton);

            $button.addClass(classes.saving);

            c.updateCards(function (res) {
                $button.removeClass(classes.saving);

                if (res.status === 'success') {
                    $form.get(0).submit();
                } else {
                    $button.addClass(classes.saveFailed);
                }
            });
        };

        $form.on('submit', function(e) {
            e.preventDefault();

            submitFormHandler();
        });
    };

    /** SCHEDULED TASKS ********************************/

    c.scheduleTasks = function() {

        var updateIntervalInSec = parseInt(snax.config.autosave_interval, 10);

        if (updateIntervalInSec <= 0) {
            return;
        }

        setInterval(function () {

            /** Update cards ************/

            c.updateCards();

        }, updateIntervalInSec * 1000);

    };

    /** API *********************************************/

    c.moveCard = function($card, difference) {
        if (difference === 0) {
            return;
        }

        var $cardToSwitchWith = $(); // Empty jQuery object.

        if (difference < 0) {
            while(difference < 0) {
                $cardToSwitchWith = $card.prev(selectors.card);

                // Previous sibling exists so switch.
                if ($cardToSwitchWith.length > 0) {
                    $card.insertBefore($cardToSwitchWith);

                    c.updateCardNumber($card, -1);
                    c.updateCardNumber($cardToSwitchWith, 1);
                }

                difference++;
            }
        }

        if (difference > 0) {
            while(difference > 0) {
                $cardToSwitchWith = $card.next(selectors.card);

                // Next sibling exists so switch.
                if ($cardToSwitchWith.length > 0) {
                    $card.insertAfter($cardToSwitchWith);

                    c.updateCardNumber($card, 1);
                    c.updateCardNumber($cardToSwitchWith, -1);
                }

                difference--;
            }
        }
    };

    c.updateCardNumber = function($card, difference) {
        // Update all cards.
        if (typeof $card === 'undefined') {
            $(selectors.cardPosition).each(function(index) {
                $(this).text(index + 1);
            });

            return;
        }

        // Update single card.
        var $position = $card.find(selectors.cardPosition);
        var newValue = parseInt($position.text(), 10);

        // Using difference param.
        if (typeof difference !== 'undefined') {
            newValue += difference;
            // Using post index.
        } else {
            newValue = $(selectors.card).index($card) + 1;
        }

        $position.text(newValue);
    };

    c.addCard = function(itemId) {
        var xhr = $.ajax({
            'type': 'GET',
            'url': snax.config.ajax_url,
            'dataType': 'json',
            'data': {
                'action':          'snax_load_item_card_tpl',
                'snax_item_id':    itemId
            }
        });

        xhr.done(function (res) {
            if (res.status === 'success') {
                var $card = $(res.args.html);

                $(selectors.cardsWrapper).append($card);

                c.updateCardNumber($card);

                $card.trigger('snaxNewCardAdded',[$card]);

                c.bumpCardsCount(1);

                // Apply MEJS player.
                if ( typeof window.wp.mediaelement !== 'undefined' ) {
                    $( window.wp.mediaelement.initialize );
                }
            }
        });
    };

    c.deleteCard = function($card) {
        var $link       = $card.find(selectors.cardDelete);

        snax.deleteItem($link, function(res) {
            if (res.status === 'success') {
                $card.trigger('snaxCardRemoved',[$card]);

                $card.remove();

                c.updateCardNumber();

                c.bumpCardsCount(-1);
            }
        });
    };

    c.updateCards = function (callback) {
        callback = callback || function() {};

        var items = [];

        $(selectors.card).each(function () {
            var $card   = $(this);
            var id      = $card.attr('data-snax-id');
            var $title  = $card.find(selectors.titleField);
            var $desc   = $card.find(selectors.descriptionField);

            // Source.
            var source = '';

            if ($card.find(selectors.hasSourceField).is(':checked')) {
                var $source = $card.find(selectors.sourceField);
                source = $.trim($source.val());
            }

            // Referral link.
            var refLink = '';

            if ($card.find(selectors.hasRefLinkField).is(':checked')) {
                var $refLink = $card.find(selectors.refLinkField);
                refLink = $.trim($refLink.val());
            }

            var cardData = {
                'id':           id,
                'title':        $.trim($title.val()),
                'source':       source,
                'ref_link':     refLink,
                'description':  $.trim($desc.val())
            };

            if (typeof ctx.updateCardDataFilter === 'function') {
                cardData = ctx.updateCardDataFilter(cardData, $card);
            }

            items.push(cardData);
        });

        // Nothing to save.
        if (items.length === 0) {
            return callback({ status: 'success' });
        }

        snax.updateItems(items, callback);
    };

    c.bumpCardsCount = function(diff) {
        cardsCount += diff;

        c.checkLimits();
    };

    c.checkLimits = function() {
        if ( cardsLimit !== -1 && cardsCount >= cardsLimit ) {
            $form.find(selectors.limitReachedNote).removeClass('snax-note-off').addClass('snax-note-on');
        } else {
            $form.find(selectors.limitReachedNote).removeClass('snax-note-on').addClass('snax-note-off');
        }
    };

    /** FROALA *****************************************/


})(jQuery, snax.frontendSubmission);


/****************************
 *
 * Component: Meme Generator
 *
 ***************************/

(function ($, ctx) {

    'use strict';

    // Register new component
    ctx.memeGenerator = {};

    // Component namespace shortcut
    var c = ctx.memeGenerator;

    /** CONFIG *******************************************/

    // CSS selectors
    var selectors = {
        'image':            'form.snax-meme .snax-form-main .snax-image img',
        'topTextInput':     'input#snax-post-meme-top-text',
        'bottomTextInput':  'input#snax-post-meme-bottom-text'
    };

    // CSS classes
    var classes = {};

    // i18n.
    var i18n = {
        'topText':      ctx.config.i18n.meme_top_text,
        'bottomText':   ctx.config.i18n.meme_bottom_text
    };

    // Config.
    var config = {
        'topText':      i18n.topText,
        'bottomText':   i18n.bottomText,
        'text':  {
            'offsetX':      30,
            'offsetY':      30,
            'fontSize':     32,
            'strokeRatio':  8 / 140
        },
        'bg': {
            'offsetX':  10,
            'offsetY':  10,
            'height':   70
        },
        'handle': {
            'width':    30,
            'height':   30,
            'offsetY':  65
        }
    };

    // Canvas objects.
    var canvas;
    var image;
    var top;
    var bottom;

    // Vars.
    var canvasWidth;
    var canvasHeight;
    var $canvas;
    var $image;

    c.selectors = selectors;
    c.classes   = classes;
    c.config    = config;

    /** INIT *******************************************/

    c.init = function () {
        if (typeof fabric === 'undefined') {
            snax.log('Fabric.js library is not loaded!');
            return;
        }

        $image = $(selectors.image);

        if ($image.length === 0) {
            snax.log('Canva image not exists!');
            return;
        }

        // @todo - MEME refactor
        $('.snax-edit-post-row-media canvas, .snax-edit-post-row-media .canvas-container').remove();

        $canvas = $('<canvas id="snax-meme-canvas"></canvas>');

        $canvas.insertBefore($image);

        canvasWidth  = $image.prop('width');
        canvasHeight = $image.prop('height');

        $image.hide();

        $canvas.attr({
            width:  canvasWidth,
            height: canvasHeight
        });

        canvas = new fabric.Canvas($canvas.get(0));

        fabric.Image.fromURL($image.attr('src'), function(img) {
            img.set({
                width:              canvasWidth,
                height:             canvasHeight,
                lockMovementX:      true,
                lockMovementY:      true,
                lockRotation:       true,
                lockScalingX:       true,
                lockScalingY:       true,
                hasControls:        false,
                hasRotatingPoint:   false,
                hoverCursor:        'default',
                evented:            false
            });

            image = img;

            var iconUrl = ctx.config.assets_url + 'images/resize-handle.svg';

            fabric.loadSVGFromURL(iconUrl, function(objects, opts) {
                var obj = fabric.util.groupSVGElements(objects, opts);

                c.loaded(obj);
            });
        });
    };

    c.loaded = function(handleIcon) {
        var topText = config.topText;
        var bottomText = config.bottomText;
        topText = $('#snax-post-meme-top-text').val();
        bottomText = $('#snax-post-meme-bottom-text').val();
        top = {
            'text':     c.createText(topText, { 'top': config.text.offsetY, 'strokeWidth': 0 }),
            'stroke':   c.createText(topText, { 'top': config.text.offsetY, 'stroke': '#000000', 'fill': '#000000' }),
            'bg':       c.createBg({ 'top': config.bg.offsetY }),
            'handle':   c.createHandle(fabric.util.object.clone(handleIcon), { 'top': config.handle.offsetY }),
            'state':    {}
        };

        var bottomTextTop = canvasHeight - config.bg.offsetY - config.bg.height + 20;

        bottom = {
            'text':     c.createText(bottomText, { top: bottomTextTop, 'strokeWidth': 0 }),
            'stroke':   c.createText(bottomText, { top: bottomTextTop, 'stroke': '#000000', 'fill': '#000000' }),
            'bg':       c.createBg({ top: canvasHeight - config.bg.offsetY - config.bg.height }),
            'handle':   c.createHandle(fabric.util.object.clone(handleIcon), { top: canvasHeight - config.bg.offsetY - config.bg.height - config.handle.height / 2 }),
            'state':    {}
        };

        // Layers.
        // -------

        // Main image.
        canvas.add(image);
        canvas.moveTo(image, 1);

        // Top.
        canvas.add(top.bg);
        canvas.moveTo(top.bg, 5);

        canvas.add(top.handle);
        canvas.moveTo(top.handle, 7);

        canvas.add(top.stroke);
        canvas.moveTo(top.stroke, 9);

        canvas.add(top.text);
        canvas.moveTo(top.text, 10);

        // Bottom.
        canvas.add(bottom.bg);
        canvas.moveTo(bottom.bg, 15);

        canvas.add(bottom.handle);
        canvas.moveTo(bottom.handle, 17);

        canvas.add(bottom.stroke);
        canvas.moveTo(bottom.stroke, 19);

        canvas.add(bottom.text);
        canvas.moveTo(bottom.text, 20);

        // Focus on top text.
        canvas.setActiveObject(bottom.handle);

        canvas.selection = false;

        // Events.
        c.handleTopTextEvents();
        c.handleBottomTextEvents();
    };

    c.createText = function(textValue, options) {
        options = options || {};

        var cfg = config.text;

        options = $.extend({
            cursorColor:    '#ffffff',
            cursorWidth:    2,
            fontFamily:     ctx.config.meme_font,
            fontSize:       cfg.fontSize,
            lineHeight:     1,
            left:           cfg.offsetX,
            width:          canvasWidth - 2 * cfg.offsetX,
            padding:        0,
            stroke:         '#000000',
            strokeWidth:    cfg.strokeRatio * cfg.fontSize,
            strokeLineCap:  'round',
            strokeLineJoin:  'round',
            fill:           '#ffffff',
            textAlign:      'center',
            lockMovementX:  true,
            lockMovementY:  true,
            hoverCursor:    'text',
            lockScalingX:   true,
            lockScalingY:   true,
            lockRotation:   true,
            hasBorders:     false,
            _fontSizeMult:  1
        }, options);

        var text = new fabric.Textbox(textValue.toUpperCase(), options);

        text.setControlVisible('ml', false);
        text.setControlVisible('mr', false);

        return text;
    };

    c.createBg = function(options) {
        options = options || {};

        options = $.extend({
            left:               config.bg.offsetX,
            width:              canvasWidth - 2 * config.bg.offsetX,
            height:             config.bg.height,
            fill:               'rgba(0,0,0, 0.33)',
            stroke:             '#ffffff',
            strokeWidth:        1,
            strokeDashArray:    [1, 4],
            lockMovementX:      true,
            lockMovementY:      true,
            lockScalingX:       false,
            lockScalingY:       false,
            excludeFromExport:  true
        }, options);
        var rect = new fabric.Rect(options);
        rect.setControlsVisibility({
            mt: false, // middle top disable
            mb: false, // midle bottom
            ml: false, // middle left
            mr: false, // I think you get it
            bl: false,
            br: false,
            tl: false,
            tr: false,
            mtr: false
        });
        return rect;
    };

    c.createHandle = function(svgIcon, options) {
        options = options || {};

        var cfg = config.handle;

        options = $.extend({
            left:               canvasWidth / 2 - cfg.width / 2,
            width:              cfg.width,
            height:             cfg.height,
            lockMovementX:      true,
            lockScalingX:       false,
            lockScalingY:       false,
            hasBorders:         false,
            hasControls:        false,
            excludeFromExport:  true
        }, options);

        svgIcon.set(options);

        return svgIcon;
    };

    /** EVENTS *****************************************/

    c.handleTopTextEvents = function() {
        var text        = top.text;
        var stroke      = top.stroke;
        var bg          = top.bg;
        var handle      = top.handle;

        // Init state.
        top.state = {
            text:           text.getText(),
            lines:          text._splitTextIntoLines().length,
            fontSize:       text.getFontSize(),
            handleMinY:     config.handle.offsetY,
            handleMaxY:     canvasHeight / 2 - config.handle.height
        };

        var state = top.state;

        var onTextChanged = function(e) {
            // Keep upper-case letters.
            text.setText(text.getText().toUpperCase());
            stroke.setText(text.getText().toUpperCase());

            // Prevent entering new text if its width exceeds the range.
            var maxTextWidth = top.bg.getWidth() - 40;

            if (text.getWidth() > maxTextWidth) {
                // Text.
                text.setText(state.text);
                text.setWidth(maxTextWidth);

                // Stroke.
                stroke.setText(state.text);
                stroke.setWidth(maxTextWidth);
            } else {
                state.text = text.getText();
            }

            // Update font size if height exceeds the range.
            var newLines = text._splitTextIntoLines().length;

            if (newLines !== state.lines) {
                state.lines = newLines;
                state.fontSize = config.text.fontSize / newLines;

                c.changeTextSize(top);
            }

            // Update input.
            if (!$(e.target).is(selectors.topTextInput)) {
                $(selectors.topTextInput).val(state.text);
            }
        };

        text.on('changed', onTextChanged);

        handle.on('moving', function() {
            var handleY     = handle.getTop();
            var bgHeight    = config.bg.height + handleY - state.handleMinY;

            // Min Y boundary.
            if (handleY <= state.handleMinY) {
                handleY     = state.handleMinY;
                bgHeight    = config.bg.height;
            }

            // Max Y boundary.
            if (handleY >= state.handleMaxY) {
                handleY     = state.handleMaxY;
                bgHeight    = state.handleMaxY - config.bg.offsetY + config.handle.height / 2;
            }

            // Update handle and bg positions.
            handle.setTop(handleY);
            bg.setHeight(bgHeight);

            c.changeTextSize(top);
        });

        $(selectors.topTextInput).on('keyup', function(e) {
            text.text = $(this).val();
            onTextChanged(e);
            canvas.renderAll();
        });
    };

    c.changeTextSize = function(obj) {
        var text    = obj.text;
        var stroke  = obj.stroke;
        var state   = obj.state;
        var diff    = obj.handle.getTop() - obj.state.handleMinY;

        var lines       = text._splitTextIntoLines().length;
        var fontSize    = text.getFontSize();

        var newFontSize = state.fontSize + diff / lines;

        text.setFontSize(newFontSize);
        stroke.setFontSize(newFontSize);

        // Does the text breaks into new line?
        if (text._splitTextIntoLines().length > lines) {
            // Main text. Reset to last valid state.
            text.setFontSize(fontSize);
            text.setWidth(canvasWidth - 2 * config.text.offsetX);

            // Stroke.
            stroke.setFontSize(fontSize);
            stroke.setWidth(canvasWidth - 2 * config.text.offsetX);
        }

        stroke.setStrokeWidth(text.getFontSize() * config.text.strokeRatio);
    };

    c.changeBottomTextSize = function(obj) {
        var text    = obj.text;
        var stroke  = obj.stroke;
        var state   = obj.state;
        var diff    = obj.state.handleMaxY - obj.handle.getTop();

        var lines       = text._splitTextIntoLines().length;
        var fontSize    = text.getFontSize();

        var newFontSize = state.fontSize + diff / lines;

        text.setFontSize(newFontSize);
        stroke.setFontSize(newFontSize);

        // Does the text breaks into new line?
        if (text._splitTextIntoLines().length > lines) {
            // Main text. Reset to last valid state.
            text.setFontSize(fontSize);
            text.setWidth(canvasWidth - 2 * config.text.offsetX);

            // Stroke.
            stroke.setFontSize(fontSize);
            stroke.setWidth(canvasWidth - 2 * config.text.offsetX);

        }

        var textOffsetTop = canvasHeight - config.text.offsetY - text.getHeight();

        text.top = textOffsetTop;
        stroke.top = textOffsetTop;

        stroke.setStrokeWidth(text.getFontSize() * config.text.strokeRatio);
    };

    c.handleBottomTextEvents = function() {
        var text        = bottom.text;
        var stroke      = bottom.stroke;
        var bg          = bottom.bg;
        var handle      = bottom.handle;

        // Init state.
        bottom.state = {
            text:           text.getText(),
            lines:          text._splitTextIntoLines().length,
            fontSize:       text.getFontSize(),
            handleMinY:     canvasHeight / 2,
            handleMaxY:     canvasHeight - config.bg.offsetY - config.bg.height - config.handle.height / 2
        };

        var state = bottom.state;

        var onTextChanged = function(e) {
            // Keep upper-case letters.
            text.setText(text.getText().toUpperCase());
            stroke.setText(text.getText().toUpperCase());

            // Prevent entering new text if its width exceeds the range.
            var maxTextWidth = bottom.bg.getWidth() - 40;

            if (text.getWidth() > maxTextWidth) {
                // Main text.
                text.setText(state.text);
                text.setWidth(maxTextWidth);

                // Stroke.
                stroke.setText(state.text);
                stroke.setWidth(maxTextWidth);
            } else {
                state.text = text.getText();
            }

            // Update font size if height exceeds the range.
            var newLines = text._splitTextIntoLines().length;

            if (newLines !== state.lines) {
                state.lines = newLines;
                state.fontSize = config.text.fontSize / newLines;

                c.changeBottomTextSize(bottom);
            }

            // Update input.
            if (!$(e.target).is(selectors.bottomTextInput)) {
                $(selectors.bottomTextInput).val(state.text);
            }
        };

        text.on('changed', onTextChanged);

        handle.on('moving', function() {
            var handleY     = handle.getTop();
            var bgHeight    = config.bg.height + state.handleMaxY - handle.getTop();

            // Min Y boundary.
            if (handleY <= state.handleMinY) {
                handleY     = state.handleMinY;
                bgHeight    = canvasHeight / 2 - config.bg.offsetY - config.handle.height / 2;
            }

            // Max Y boundary.
            if (handleY >= state.handleMaxY) {
                handleY     = state.handleMaxY;
                bgHeight    = config.bg.height;
            }

            // Update handle and bg positions.
            handle.setTop(handleY);
            bg.setTop(handleY + config.handle.height / 2);
            bg.setHeight(bgHeight);

            c.changeBottomTextSize(bottom);
        });

        $(selectors.bottomTextInput).on('keyup', function(e) {
            text.text = $(this).val();
            onTextChanged(e);
            canvas.renderAll();
        });
    };

    c.getImageBase64 = function() {
        if (!canvas) {
            return false;
        }

        var imageOrigWidth  = parseInt($image.attr('width'), 10);
        var imageCurrWidth  = canvasWidth;

        var scaleMultiplier = imageOrigWidth / imageCurrWidth;

        c.excludeFromExport(true);

        // Scale to origianl image size.
        c.scaleCanvas(scaleMultiplier);
        var quality = ctx.config.jpg_quallity * 0.01;

        // Don't use the canvas object here. Use DOM canvas object instead.
        // The canvas is a Fabric.js object and contains tons of library objects (it's huge).
        var data = $canvas.get(0).toDataURL('image/jpeg', quality);

        // Restore for further processing, if necessary.
        c.excludeFromExport(false);
        c.scaleCanvas(1 / scaleMultiplier);

        return data;
    };

    c.scaleCanvas = function(multiplier) {
        var objects = canvas.getObjects();

        for (var i in objects) {
            objects[i].scaleX = objects[i].scaleX * multiplier;
            objects[i].scaleY = objects[i].scaleY * multiplier;
            objects[i].left = objects[i].left * multiplier;
            objects[i].top = objects[i].top * multiplier;
            objects[i].setCoords();
        }

        canvas.setWidth(canvas.getWidth() * multiplier);
        canvas.setHeight(canvas.getHeight() * multiplier);
        canvas.renderAll();
        canvas.calcOffset();
    };

    c.excludeFromExport = function(bool) {
        var visible = !bool;

        top.bg.visible = visible;
        top.handle.visible = visible;

        bottom.bg.visible = visible;
        bottom.handle.visible = visible;
    };

    /**
     * Get Blob object from canvas
     *
     * @param callback      Callback function.
     * @param image_type    Image type.
     * @param quality       Image quality.
     */
    c.getBlobFromCanvas = function(callback, image_type, quality) {
        var canvasDOM = $canvas.get(0);

        // Is blob supported in the browser?
        if (canvasDOM.toBlob) {
            canvasDOM.toBlob(function(blob) {
                callback(blob, true);
            }, image_type, quality);

        // Get Base64 dataurl from canvas, then try to convert it to Blob.
        } else {
            var dataUrl = canvasDOM.toDataURL(image_type, quality);
            var blob = null;

            // Try to convert dataURL to Blob (requires https://unpkg.com/blob-util/dist/blob-util.min.js).
            if (typeof blobUtil !== 'undefined' && blobUtil.dataURLToBlob) {
                blob = blobUtil.dataURLToBlob(dataUrl);
            }

            // Conversion failed. Retunr dataURL.
            if(blob == null) {
                callback(dataUrl, false);
            } else {
                callback(blob, true);
            }
        }
    };

})(jQuery, snax.frontendSubmission);

/****************************
 *
 * Component: Quiz
 *
 ***************************/

(function ($, ctx) {

    'use strict';

    // Register new component
    ctx.quiz = {};

    // Component namespace shortcut
    var c = ctx.quiz;

    /** INIT *******************************************/

    c.init = function () {
        if (typeof snax_quizzes === 'undefined') {
            return;
        }

        // Override backend UI.
        snax_quizzes.openMediaLibrary = useFrontendImageUploader;
        snax_quizzes.mediaDeleted = removeMediaFromLibrary;
    };

    var useFrontendImageUploader = function(callbacks) {
        ctx.uploadMedia.fileUploadedCallback = function(mediaId) {
            var imageObject = { id: mediaId };

            callbacks.onSelect(imageObject);

            // Reset.
            ctx.uploadMedia.fileUploadedCallback = null;
        };

        var $browseButton = $('.snax-quiz-upload .moxie-shim-html5 input[type=file]');

        if ($browseButton.length === 0) {
            $browseButton = $('.snax-quiz-upload .snax-plupload-browse-button');
        }

        if ($browseButton.length > 0) {
            $browseButton.trigger('click');
        } else {
            alert('File browser not accessible!');
        }
    };

    var removeMediaFromLibrary = function(mediaId) {
        snax.deleteMedia({
            'mediaId':  mediaId,
            'authorId': snax.currentUserId
        });
    };

})(jQuery, snax.frontendSubmission);

/****************************
 *
 * Component: Poll
 *
 ***************************/

(function ($, ctx) {

    'use strict';

    // Register new component
    ctx.poll = {};

    // Component namespace shortcut
    var c = ctx.poll;

    /** INIT *******************************************/

    c.init = function () {
        if (typeof snax_polls === 'undefined') {
            return;
        }

        // Override backend UI.
        snax_polls.openMediaLibrary = useFrontendImageUploader;
        snax_polls.mediaDeleted = removeMediaFromLibrary;
    };

    var useFrontendImageUploader = function(callbacks) {
        ctx.uploadMedia.fileUploadedCallback = function(mediaId) {
            var imageObject = { id: mediaId };

            callbacks.onSelect(imageObject);

            // Reset.
            ctx.uploadMedia.fileUploadedCallback = null;
        };

        // Microsoft Edge requires this selector.
        var $browseButton = $('.snax-poll-upload .moxie-shim-html5 input[type=file]');

        if ($browseButton.length === 0) {
            $browseButton = $('.snax-poll-upload .snax-plupload-browse-button');
        }

        if ($browseButton.length > 0) {
            $browseButton.trigger('click');
        } else {
            alert('File browser not accessible!');
        }
    };

    var removeMediaFromLibrary = function(mediaId) {
        snax.deleteMedia({
            'mediaId':  mediaId,
            'authorId': snax.currentUserId
        });
    };

})(jQuery, snax.frontendSubmission);


/****************************
 *
 * Component: Meme templates
 *
 ***************************/

(function ($, ctx) {

        'use strict';

        // Register new component
        ctx.memeTemplates = {};

        // Component namespace shortcut
        var c = ctx.memeTemplates;

        var selectors = {
            'post':                     '.snax-form-frontend',
            'templatesTab':             '.snax-tab-content-meme-templates'
        };

        var classes = {
            'postWithoutMedia':     'snax-form-frontend-without-media',
            'postWithMedia':        'snax-form-frontend-with-media',
            'postWithRemovedMedia': 'snax-form-frontend-with-removed-media'
        };

        /** INIT *******************************************/

        c.init = function () {
            $('.snax-meme-template').on('click', function() {
                var $this = $(this);
                $('#snax-post-meme-top-text').val($this.attr('data-bimber-template-top-text'));
                $('#snax-post-meme-bottom-text').val($this.attr('data-bimber-template-bottom-text'));
                $(selectors.templatesTab).removeClass('snax-tab-content-current');
                var mediaId = $this.attr('data-bimber-template-img');
                var data = {
                    'memeTemplate':  $this.attr('data-bimber-template'),
                    'title':        $this.attr('data-bimber-template-title')
                };
                ctx.uploadMedia.createMedia(mediaId, 'image', null, data);

                ctx.form.clearDemoDataOnMediaUploaded();

                var $post = $(selectors.post);

                // Switch from "Init" form to "Full" form.
                if ($post.hasClass(classes.postWithoutMedia)) {
                    $('body').trigger('snaxFullFormLoaded', [$post]);
                }

                $post.
                    removeClass(classes.postWithoutMedia + ' ' + classes.postWithRemovedMedia).
                    addClass(classes.postWithMedia);

                $('#snax-post-title').val($this.attr('data-bimber-template-title'));

                $('html, body').animate({
                    scrollTop: $(".snax-form-frontend").offset().top
                }, 100);

            });
            $('body').on('snaxMediaRemoved', function(){
                $(selectors.templatesTab).addClass('snax-tab-content-current');
                $(selectors.templatesTab).removeClass('snax-tab-content-hidden');
                $(selectors.templatesTab).addClass('snax-tab-content-visible');
            });

            var templateInURL = snax.getUrlParameter('meme_template');
            if (typeof templateInURL !== 'undefined' && $('.snax-edit-post-row-image').children().length === 0) {
                $('.snax-meme-template-' + templateInURL).trigger('click');
            }
        };


    })(jQuery, snax.frontendSubmission);
