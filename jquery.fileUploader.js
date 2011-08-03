/*
*	Class: fileUploader
*	Use: Upload multiple files using your native form
*	Author: John Laniba (http://pixelcone.com)
*	Version: 1.2
*/

(function($) {
	$.fileUploader = {version: '1.2', count: 0};
	$.fn.fileUploader = function(config){
		
		config = $.extend({}, {
			limit: false,
			imageLoader: '',
			buttonUpload: '#pxUpload',
			buttonClear: '#pxClear',
			successOutput: 'File Uploaded',
			errorOutput: 'Failed',
			allowedExtension: 'jpg|jpeg|gif|png',
			
			//Callbacks
			onFileChange: function(){},
			onFileRemove: function(){},
			beforeUpload: function(){}, //trigger after the submit button is click: before upload
			beforeEachUpload: function(){}, //callback before each file has been uploaded ::: returns each Form
			afterUpload: function(){},
			afterEachUpload: function(){} //callback after each file has been uploaded
			
		}, config);
		
		$.fileUploader.count++;
		
		var pxUploadForm = 'pxupload_form' + $.fileUploader.count;
		var pxButton = 'px_button' + $.fileUploader.count;
		var wrapper = ' \
			<div id="'+ pxUploadForm +'"></div> \
			<div id="'+ pxButton +'" class="px_button"></div> \
		';
		pxUploadForm = '#' + pxUploadForm;
		pxButton = '#' + pxButton;
		
		var itr = 1; //index/itr of file
		var isLimit = (config.limit)? true : false;
		var limit = parseInt(config.limit);
		
		var e = this; //set e as this
		var selector = $(this).selector;
		var buttonM = pxButton + ' input, '+ pxButton +' button'; //Accept button as input and as button
		var isFile = false; //Var declaration
		
		var px = {
			
			//Initialize and format data
			init: function(){
				px.form = $(e).parents('form');
				
				//prepend wrapper markup
				px.form.before(wrapper);
				
				//clear all form data
				px.clearFormData(px.form);
				
				//move upload and clear button into id px_button
				px.form.find(config.buttonUpload + ',' + config.buttonClear).appendTo(pxButton);
				
				px.form.hide();
				this.printForm();
				
				//Disable button
				$(buttonM).attr('disabled','disabled');	
			},
			
			//Clone, format and append form
			printForm: function(){
				
				var formId = 'pxupload' + itr;
				var iframeId = formId + '_frame';
				
				$('<iframe name="'+ iframeId +'"></iframe>').attr({
					id: iframeId,
					src: 'about:blank',
					style: 'display:none'
				}).prependTo(pxUploadForm);
				
				px.form.clone().attr({
					id: formId,
					target: iframeId
				}).prependTo(pxUploadForm).show();
				
				//Show only the file input
				px.showInputFile( '#'+formId );
				
				//This is not good but i left no choice cause live function is not working on IE
				$(selector).change(function() {
					uploadChange($(this));
				});
			},
			
			//Show only the file input
			showInputFile: function(form) {
				$(pxUploadForm).find(form).children().each(function(){
					isFile = $(this).is(':file');
					if (!isFile && $(this).find(':file').length == 0) {
						$(this).hide();
					}
				});
			},
			//Hide file input and show other data
			hideInputFile: function(form) {
				$(pxUploadForm).find(form).children().each(function(){
					isFile = $(this).is(':file');
					if (isFile || $(this).find(':file').length > 0) {
						$(this).hide();
					} else {
						$(this).show();
					}
				});
			},
			
			//Validate file
			validateFile: function(file) {
				if (file.indexOf('/') > -1){
					file = file.substring(file.lastIndexOf('/') + 1);
				}else if (file.indexOf('\\') > -1){
					file = file.substring(file.lastIndexOf('\\') + 1);
				}
				
				var extensions = new RegExp(config.allowedExtension + '$', 'i');
				if (extensions.test(file)){
					return file;
				} else {
					return -1;
				}
			},
			
			//clear form
			clearFormData: function(form) {
				$(form).find(':input').each(function() {
					switch(this.type) {
						case 'file':
						case 'password':
						case 'select-multiple':
						case 'select-one':
						case 'text':
						case 'textarea':
							$(this).val('');
							break;
						case 'checkbox':
						case 'radio':
							this.checked = false;
					}
				});
			}
			
		}
		
		//initialize
		px.init();
		
		/*
		*	On Change of upload file
		*/
		
		function uploadChange($this) {
			//remove upload text after uploaded
			var uploadText = $(pxUploadForm).data('upload');
			if (uploadText) {
				$('.uploadData', pxUploadForm).remove();
				$(pxUploadForm).removeData('upload');
			}
			
			var $form = $this.parents('form');
			
			//validate file
			var filename = px.validateFile( $this.val() );
			if (filename == -1){
				alert ('Invalid file!');
				$(e).val('');
				return false;
			}
			
			//remove disabled attr
			$(buttonM).removeAttr('disabled');
			
			var loader = 'Uploading...';
			if ($.trim(config.imageLoader) != ''){
				loader = '<img src="'+ config.imageLoader +'" alt="uploader" />';
			}
			
			var display = ' \
				<div class="uploadData" id="pxupload'+ itr +'_text" title="pxupload'+ itr +'"> \
					<div class="close">&nbsp;</div> \
					<span class="fname">'+ filename +'</span> \
					<span class="loader" style="display:none">'+ loader +'</span> \
					<div class="status">Pending...</div> \
				</div> \
			';
			$(pxUploadForm).append(display);
			$form.appendTo(pxUploadForm + ' #pxupload'+ itr +'_text');
			
			//hide the input file
			px.hideInputFile( '#' + $form.attr('id') );
			
			//increment for printing form
			itr++;
			
			//Limit
			if (!isLimit) {
				px.printForm();
			} else if (--limit) {
				px.printForm();
			}
			
			//Callback on file Changed
			config.onFileChange($this, $form);
		}
		
		/*
		*	Process form Upload
		*/
		$(config.buttonUpload, pxButton).click(function(){
			$(buttonM).attr('disabled','disabled');
			
			//trigger before upload callback
			config.beforeUpload(e);
			
			//a variable that counts all the files that are uploaded
			var fileTobeUpLoaded = 0;
			
			$(pxUploadForm + ' form').each(function(){
				$this = $(this);
				
				var id = pxUploadForm + ' #' + $this.attr('id');
				var filename = $(this).find(selector).val();
				
				if (filename != ''){
					
					//increment file to be uploaded
					fileTobeUpLoaded++;
					
					$(pxUploadForm).data('upload', true);
					
					//trigger before upload callback
					config.beforeEachUpload($this);
					
					$(id + '_text .status').text('Uploading...');
					$(id + '_text').css('background-color', '#FFF0E1');
					$(id + '_text .loader').show();
					$(id + '_text .close').hide();
					
					$(id).submit();
					$(id +'_frame').load(function(){
						$(id + '_text .loader').hide();
						
						data = $(this).contents().find('body').html();
						output = $(this).contents().find('#output').text();
						
						//trigger after each upload
						config.afterEachUpload(data, output, id + '_text');
						
						if (output == 'success'){
							$(id + '_text').css('background-color', '#F0F8FF');
							output = config.successOutput;
						} else {
							$(id + '_text').css('background-color', '#FF0000');
							output = config.errorOutput;
						}
						output += '<br />' + $(this).contents().find('#message').text();
						$(id + '_text .status').html(output);
						
						$(id).remove();
						$(id + '_frame').remove();
						
						$(config.buttonClear, pxButton).removeAttr('disabled');
						$(selector).removeAttr('disabled');
						
						//decrement file to be uploaded
						fileTobeUpLoaded--
						if (fileTobeUpLoaded == 0) {
							//trigger after upload is all executed
							config.afterUpload(e);
						}
					});
				} else {
					//disable all file
					$(this).find(selector).attr('disabled','disabled');
				}
			});
		});
		
		//Button Clear Event
		$(config.buttonClear, pxButton).click(function(){
			$(pxUploadForm).fadeOut('slow',function(){
				$(this).empty();
				$(this).show();
				
				itr = 1; //reset iteration
				limit = parseInt(config.limit);
				
				//print the First form
				px.printForm();
				
				//disable button
				$(buttonM).attr('disabled','disabled');				
			});
		});
		
		$('.close', pxUploadForm).live('click', function(){
			
			if (isLimit) {
				if (limit == 0) {
					px.printForm();
				}
				limit++;
			}
			
			var id = pxUploadForm + ' #' + $(this).parent().attr('title');
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
			
			return false;
		});
		
		return this;
	}
})(jQuery);