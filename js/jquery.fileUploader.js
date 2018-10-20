/*
*	Class: fileUploader
*	Use: Upload multiple files using jquery
*	Author: John Laniba (http://pixelcone.com)
*	Version: 2.0
*/

(function($) {
	$.fileUploader = {version: '2.0', count: 0};
	$.fn.fileUploader = function(config) {

		config = $.extend({}, {
			autoUpload: false,
			limit: false,
			buttonUpload: '#px-submit',
			buttonClear: '#px-clear',
			buttonInput: '.px-file-input',
			selectFileLabel: 'Select files',
			allowedExtension: 'jpg|jpeg|gif|png',
			timeInterval: [1, 2, 4, 2, 1, 5], //Mock percentage for iframe upload
			percentageInterval: [10, 20, 30, 40, 60, 80],
			getData: 'result',

			//Callbacks
			onValidationError: null,	//trigger if file is invalid
			onFileChange: function(){},
			onFileRemove: function(){},
			beforeUpload: function(){}, //trigger after the submit button is click: before upload
			beforeEachUpload: function(){}, //callback before each file has been uploaded ::: returns each Form
			afterUpload: function(){},
			afterEachUpload: function(){} //callback after each file has been uploaded

		}, config);

		$.fileUploader.count++;

		//Multiple instance of a FOrm Container
		var pxUploadForm = 'px-form-' + $.fileUploader.count,
		pxWidget = 'px-widget-' + $.fileUploader.count,
		pxButton = 'px-button-' + $.fileUploader.count,
		wrapper = ' \
			<div id="'+ pxWidget +'" class="px-widget ui-widget row"> \
				<div id="'+ pxUploadForm +'-input" class="px-form-input"></div> \
				<div id="'+ pxButton +'" class="px-buttons"></div> \
				<div id="'+ pxUploadForm +'" class="px-form-display"></div> \
			</div> \
		',
		pxUploadForm = '#' + pxUploadForm,
		pxUploadFormInput = pxUploadForm + '-input',
		pxButton = '#' + pxButton,
		pxWidget = '#' + pxWidget,
		buttonClearId = null,

		itr = 1, //index/itr of file
		isLimit = (config.limit)? true : false,
		limit = parseInt(config.limit),

		e = this, //set e as this
		buttonM = pxButton + ' input, '+ pxButton +' button'; //Accept button as input and as button
		isFile = false, //this is use to hide other inputs in a form
		progress = 0, //percentage of the upload,
		totalForm = 0,
		jqxhr = null, //return object from jquery.ajax,
		timeInterval = config.timeInterval,
		percentageInterval = config.percentageInterval,
		pcount = 0, //progress count to set interval,
		progressTime = null,
		stopUpload = false; //Stop all upload

		if (window.FormData) {
			var isHtml5 = true;
		} else {
			var isHtml5 = false;
		}

		//Wrap all function that is accessable within the plugin
		var px = {

			//Initialize and format data
			init: function(){
				px.form = $(e).parents('form');

				//prepend wrapper markup
				px.form.before(wrapper);

				//Wrap input button
				$(e).hide();
				$(e).wrap('<label class="btn btn-info px-input-button" />');
				px.form.find('.px-input-button').prepend('<ion-icon name="add-circle"></ion-icon> '+ config.selectFileLabel);

				//move upload and clear button into id px_button
				px.form.find(config.buttonUpload + ',' + config.buttonClear).appendTo(pxButton);

				//clear all form data
				px.clearFormData(px.form);

				px.form.hide();
				this.printForm();

				//Disable button
				$(buttonM).attr('disabled','disabled');
			},

			//Clone, format and append form
			printForm: function(){

				var formId = 'pxupload' + itr,
				iframeId = formId + '_frame';

				$('<iframe name="'+ iframeId +'"></iframe>').attr({
					id: iframeId,
					src: 'about:blank',
					style: 'display:none'
				}).prependTo(pxUploadFormInput);

				px.form.clone().attr({
					id: formId,
					target: iframeId
				}).prependTo(pxUploadFormInput).show();

				//Show only the file input
				px.showInputFile( '#'+formId );

				$(config.buttonInput).change(function() {
					if (isHtml5) {
						$.html5Change(this.files);
					} else {
						$.uploadChange($(this));
					}
				});
			},

			//Show only the file input
			showInputFile: function(form) {
				$(pxUploadFormInput).find(form).children().each(function(){

					isFile = $(this).is(':file');
					if (!isFile && $(this).find(':file').length == 0) {
						$(this).hide();
					}
				});
			},
			//Hide file input and show other data
			hideInputFile: function($form) {
				$form.children().each(function(){
					isFile = $(this).is(':file');
					if (isFile || $(this).find(':file').length > 0) {
						$(this).hide();
					} else {
						$(this).show();
					}
				});
			},

			//Validate file
			getFileName: function(file) {

				if (file.indexOf('/') > -1){
					file = file.substring(file.lastIndexOf('/') + 1);
				} else if (file.indexOf('\\') > -1){
					file = file.substring(file.lastIndexOf('\\') + 1);
				}

				return file;
			},

			getFileExtension: function(file) {
                var re = /(?:\.([^.]+))?$/;
                var file_extension = re.exec(file)[1];
                return file_extension;
            },

			validateFileName: function(filename) {
				var extensions = new RegExp(config.allowedExtension + '$', 'i');
				var file_extension = px.getFileExtension(filename);

				if (extensions.test(file_extension)){
					return filename;
				} else {
					return -1;
				}
			},

			getFileSize: function(file) {
				var fileSize = 0;
				if (file.size > 1024 * 1024) {
					fileSize = (Math.round(file.size * 100 / (1024 * 1024)) / 100).toString() + 'MB';
				} else {
					fileSize = (Math.round(file.size * 100 / 1024) / 100).toString() + 'KB';
				}
				return fileSize;
			},

			//clear form data
			clearFormData: function(form) {
				$(form).find(':input').each(function() {
					if (this.type == 'file') {
						$(this).val('');
					}
				});
			}

		}

		//initialize
		px.init();

		/*
		*	Plugin Events/Method
		*/

		/*
		* Html5 file change
		*/
		$.html5Change = function($files) {
			$.each( $files, function(index, file){
				$.uploadChange(file);
			});

			$.afterUploadChange();
		}

		/*
		*	Html5 Drag and Drop
		*/
		$(pxWidget).bind( 'dragenter dragover', false)
		.bind( 'drop', function( e ) {
			e.stopPropagation();
			e.preventDefault();

            $files = e.originalEvent.target.files || e.originalEvent.dataTransfer.files;
			$.html5Change($files);

		});

		/*
		*	On Change of upload file
		*/
		$.uploadChange = function($this) {

			var $form = $(pxUploadFormInput + ' #pxupload'+ itr);

			//validate file
			var filename = (isHtml5)? $this.name : px.getFileName( $this.val() );
			if ( px.validateFileName(filename) == -1 ){
				if ($.isFunction(config.onValidationError)) {
					config.onValidationError($this);
				} else {
					alert ('Invalid file!');
				}
				$form.find(':file').val('');
				return false;
			}

			//Limit
			if (limit <= 0) {
				//Your message about exceeding limit

				return false;
			}
			limit = limit - 1;

			//remove disabled attr
			$(buttonM).removeAttr('disabled');

			//remove upload text after uploaded
			$('.upload-data', pxUploadForm).each(function() {
				if ( $(this).find('form').length <= 0 ) {
					$(this).remove();
				}
			});

            var thumb = null;
			//append size of the file after filename
			if (isHtml5) {
				filename += ' (' + px.getFileSize($this) + ')';
				if($this.type.match(/image.*/)) {
					thumb = document.createElement("img");
					thumb.classList.add("uploadThumb");
					thumb.height = 75;
					thumb.file = $this;
				}
			}

			//DIsplay syled markup
			$(pxUploadForm).append(
				$('<div>').attr({
					'class': 'upload-data pending ui-widget-content ui-corner-all',
					id: 'pxupload'+ itr +'_text'
				})
				.data('formId', 'pxupload'+ itr)
				.append(' \
					<ul class="actions ui-helper-clearfix"> \
						<li title="Upload" class="upload ui-state-default ui-corner-all"> \
							<span class="ui-icon ui-icon-circle-triangle-e"></span> \
						</li> \
						<li title="Delete" class="delete ui-state-default ui-corner-all"> \
							<span class="ui-icon ui-icon-circle-minus"></span> \
						</li> \
					</ul> \
					<span class="filename">'+ filename +'</span> \
					<div class="progress ui-helper-clearfix"> \
						<div class="progressBar" id="progressBar_'+ itr +'"></div> \
						<div class="percentage">0%</div> \
					</div> \
					<div class="status">Pending...</div> \
				')
			);

			if (isHtml5 && thumb!=null) {
				$(pxUploadForm).find(".actions").after(thumb);
				var reader = new FileReader();
				reader.onload = (function(aImg) { return function(e) { aImg.src = e.target.result; }; })(thumb);
				reader.readAsDataURL($this);
			}

			//Store input in form
			$form.data('input', $this);

			$form.appendTo(pxUploadForm + ' #pxupload'+ itr +'_text');

			//hide the input file
			px.hideInputFile( $form );

			//increment for printing form
			itr++;

			//print form
			px.printForm();

			//Callback on file Changed
			config.onFileChange($this, $form);

			if (!isHtml5) {
				$.afterUploadChange();
			}
		}

		/*
		*	After upload change triggers autoupload
		*/
		$.afterUploadChange = function() {

			if (config.autoUpload) {

				//Display Cancel Button
				$.toogleCancel(true)

				stopUpload = false;
				//Queue and process upload
				$.uploadQueue();
			}
		}

		/*
		*	Queue Upload and send each form to process upload
		*/
		$.uploadQueue = function() {

			//stop all upload
			if (stopUpload) {
				return;
			}

			totalForm = $(pxUploadForm + ' form').parent('.upload-data').get().length;
			if (totalForm > 0) {
				pendingUpload = $(pxUploadForm + ' form').parent('.upload-data').get(0);
				$form = $(pendingUpload).children('form');

				//before upload
				$.beforeEachUpload( $form );

				if (isHtml5) {
					//Upload Using Html5 api
					$.html5Upload( $form );
				} else {
					//upload using iframe
					$.iframeUpload( $form );
				}
			} else {
				config.afterUpload(pxUploadForm);

				//Revert Button to clear
				$.toogleCancel(false);
			}
		}

		/*
		*	Process form Upload
		*/
		$.html5Upload = function($form) {
			file = $form.data('input');
			if (file) {
				var fd = new FormData();
				fd.append($form.find(config.buttonInput).attr('name'), file);
				//get other form input and append to formData
				$form.find(':input').each(function() {
					if (this.type != 'file') {
						fd.append($(this).attr('name'), $(this).val());
					}
				});

				//show progress bar
				$uploadData = $form.parent();
				$uploadData.find('.progress').show();
				$progressBar = $uploadData.find('.progressBar');
				$percentage = $uploadData.find('.percentage');

				//Upload using jQuery AJAX
				jqxhr = $.ajax({
					url: $form.attr('action'),
					data: fd,
					cache: false,
					contentType: false,
					processData: false,
					dataType: 'json',
					type: 'POST',
					xhr: function() {
						var req = $.ajaxSettings.xhr();
						if (req) {
							req.upload.addEventListener('progress',function(ev){
								//Display progress Percentage
								progress = Math.round(ev.loaded * 100 / ev.total);
								$percentage.text(progress.toString() + '%');
								$progressBar.progressbar({
									value: progress
								});
							}, false);
						}
						return req;
					}
				})
				.done(function(data) {
					$.afterEachUpload($form.attr('id'), data );
				})
				.fail(function(jqXHR, textStatus, errorThrown) {
					$.afterEachUpload($form.attr('id'), null, textStatus, errorThrown );
				})
				.always(function(jqXHR, textStatus) {
					$progressBar.progressbar({
						value: 100
					});
					$percentage.text('100%');

					$.uploadQueue();
				});
			}

			$form.remove();
		}

		/*
		*	Iframe Upload Process
		*/
		$.iframeUpload = function($form) {

			//show progress bar
			$uploadData = $form.parent();
			$uploadData.find('.progress').show();
			$percentage = $uploadData.find('.percentage');
			$progressBar = $uploadData.find('.progressBar');

			pcount = 0;
			$.dummyProgress($progressBar, $percentage);

			$form.submit();

			var id = pxWidget + ' #' + $form.attr('id');
			$(id +'_frame').load(function(){

				data = $(this).contents().find('body').html();

				$.afterEachUpload($form.attr('id'), data);

				clearTimeout ( progressTime );
				progress = 100;
				$percentage.text(progress.toString() + '%');
				$progressBar.progressbar({
					value: progress
				});

				$.uploadQueue();

			});
		}

		/*
		*	Show the progress bar to the user
		*/
		$.dummyProgress = function($progressBar, $percentage) {

			if (percentageInterval[pcount]) {
				progress = percentageInterval[pcount] + Math.floor( Math.random() * 5 + 1 );
				$percentage.text(progress.toString() + '%');
				$progressBar.progressbar({
					value: progress
				});
			}

			if (timeInterval[pcount]) {
				progressTime = setTimeout(function(){
					$.dummyProgress($progressBar, $percentage)
				}, timeInterval[pcount] * 1000);
			}

			pcount++;
		}

		/*
		*	before Upload
		*/
		$.beforeAllUpload = function() {
			//trigger before upload callback
			$continue = config.beforeUpload(e, pxButton);
			if ($continue === false) {
				return false;
			}

			//Show Cancle Button
			$.toogleCancel(true);

			//process and queue upload
			$.uploadQueue();
		}

		/*
		* Before Each file is uploaded
		*/
		$.beforeEachUpload = function($form) {

			//trigger before upload callback
			config.beforeEachUpload($form);

			$uploadData = $form.parent();
			$uploadData.find('.status').text('Uploading...');
			$uploadData.removeClass('pending').addClass('uploading');
			$uploadData.find('.delete').removeClass('delete').addClass('cancel').attr('title', 'Cancel');
		}

		/*
		* After Each file is uploaded
		*/
		$.afterEachUpload = function(formId, data, status, errorThrown) {
			if (data) {
				data = data[config.getData]
				status = data.status;
			}

			formId = pxWidget + ' #' + formId;
			$uploadData = $(formId + '_text');

			if (status == 'success'){

				$uploadData.removeClass('uploading').addClass('success');
				$uploadData.children('.status').html( data.message );

			} else if (status == 'error'){

				$uploadData.removeClass('uploading').addClass('error');

				//if client side error other display error from backend
				if (errorThrown) {
					$uploadData.children('.status').html( errorThrown );
				} else {
					$uploadData.children('.status').html( data.message );
				}

			} else if (status == 'abort') {

				$uploadData.removeClass('uploading').addClass('cancel');

				$uploadData.children('.status').html( 'Cancelled' );
			}

			$uploadData.find('.cancel').removeClass('cancel').addClass('delete').attr('title', 'Delete');

			//hide progress bar
			$uploadData.find('.progress').hide();

			//trigger after each upload
			config.afterEachUpload(data, status, $uploadData);

			$(formId).remove();
			$(formId + '_frame').remove();
		}

		/*
		*	Toggle Cancel/Delete button
		*/
		$.toogleCancel = function(cancel) {

			if (cancel) {
				//store button clear id
				buttonClearId = $(config.buttonClear, pxButton).attr('id');
				//Cancel Button
				$(config.buttonClear, pxButton).attr({ id: 'px-cancel', title: 'Cancel' });
			} else {
				//Clear button
				$('#px-cancel', pxButton).attr({ id: buttonClearId, title: 'Clear' });
			}
		}

		/*
		*	Onlick submit button: start upload
		*/
		$(config.buttonUpload, pxButton).click(function(){

			stopUpload = false;

			$.beforeAllUpload();
		});

		/*
		* Individual Upload
		*/
		$(document).on('click', pxUploadForm + ' .upload', function(){
			$form = $(this).parents('.upload-data').children('form');
			if ($form.length > 0) {

				//Show Cancle Button
				$.toogleCancel(true);

				//before upload
				$.beforeEachUpload( $form );

				if (isHtml5) {
					//Upload Using Html5 api
					$.html5Upload( $form );
				} else {

					//upload using iframe
					$.iframeUpload( $form );
				}

				stopUpload = true;
			}
		});

		//Button Clear Event
		$(document).on('click', pxButton + ' ' + config.buttonClear, function(){
			$(pxUploadForm).fadeOut('slow',function(){
				$(this).empty();
				$(this).show();
				$(pxUploadFormInput).empty();

				itr = 1; //reset iteration
				limit = parseInt(config.limit);

				//print the First form
				px.printForm();

				//disable button
				$(buttonM).attr('disabled','disabled');
			});
		});

		$(document).on('click', pxUploadForm + ' .delete', function(){

			limit++;

			var id = pxWidget + ' #' + $(this).parents('.upload-data').data('formId');
			$(id+'_text').fadeOut('slow',function(){
				$(id+'_frame').remove();
				$(this).remove();

				//disable button
				if ($(pxUploadForm).find('form').length <= 1) {
					$(buttonM).attr('disabled','disabled');
				}
			});

			//on file remove callback
			config.onFileRemove(this);
		});

		/*
		*	Cancel individual upload
		*/
		$(document).on('click', pxUploadForm + ' .cancel', function() {
			if (jqxhr) {
				jqxhr.abort();
			}

			if (!isHtml5) {
				$form = $(this).parents('.upload-data').children('form');
				$form.remove();
				$.afterEachUpload($form.attr('id'), null, 'abort', 'Cancelled');
			}
		});

		/*
		*	Cancel all uploads
		*/
		$(document).on('click', pxButton + ' #px-cancel', function(){
			stopUpload = true;
			if (jqxhr) {
				jqxhr.abort();
			}

			$('form', pxUploadForm).each(function(){
				$.afterEachUpload($(this).attr('id'), null, 'abort', 'Cancelled');
			});

			//Show Clear Button
			$.toogleCancel(false);
		});

		/* Icons hover */
		$(document).on("mouseover mouseout", ".px-widget .actions li", function(event) {
			if ( event.type == "mouseover" ) {
				$(this).addClass('ui-state-hover');
			} else {
				$(this).removeClass("ui-state-hover");
			}
		});

		return this;
	}
})(jQuery);
