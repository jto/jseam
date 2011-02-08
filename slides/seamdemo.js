	USE_WORKER = true;
	(function(){

		var worker = new Worker('../worker.js');

		document.addEventListener('DOMContentLoaded', function(){
			var orgCtx = orgCanvas.getContext('2d');
			var grayCtx = grayCanvas.getContext('2d');
			var sobelCtx = sobelCanvas.getContext('2d');
			var energyCtx = energyCanvas.getContext('2d');
			var seamCtx = seamCanvas.getContext('2d');
			var drawCtx = drawCanvas.getContext('2d');
			
			var originalImage = new Image();
								
			//originalImage.src = "images/fusee.gif";
			//originalImage.src = "images/people.jpg";
			//originalImage.src = "images/forest.jpg";
			originalImage.src = "../images/desert.jpg";
			//originalImage.src = "images/dolphin.jpg";
													
			//Seam carving function
			originalImage.addEventListener('load', function(){
				var res = function(){					
					container.style.height = originalImage.height + "px";
					container.style.width = originalImage.width + "px";
					drawCanvas.height = sobelCanvas.height = grayCanvas.height = energyCanvas.height = seamCanvas.height = orgCanvas.height = originalImage.height;
					drawCanvas.width = sobelCanvas.width = grayCanvas.width = energyCanvas.width = seamCanvas.width = orgCanvas.width = originalImage.width;
				
					orgCtx.drawImage(originalImage, 0,0);
					seamCtx.drawImage(originalImage, 0,0);
				
					drawCtx.clearRect(0,0,originalImage.width, originalImage.height);
					
					orgCanvas.style.width = originalImage.width + "px";
					drawCanvas.style.width = originalImage.width + "px";
				}
				res();
				
				resetbtn.addEventListener('click', res);
				
				drawCtx.setFillColor("#00FF00")
				
				redMark.addEventListener('change', function(){
					if(this.checked)
						drawCtx.setFillColor("#FF0000")
					else
						drawCtx.setFillColor("#00FF00")
				})
				
				// Mask markers
				var onmove = function(e){
					var x = e.clientX - container.offsetLeft + document.body.scrollLeft;
					var y = e.clientY - container.offsetTop + document.body.scrollTop;
					//console.log("x: " + x + " y: " + y);
					var s = 15;
					drawCtx.beginPath();
					drawCtx.arc(x, y, s, 0, Math.PI * 2, true); 
					drawCtx.closePath();
					drawCtx.fill();
				}
				drawCanvas.addEventListener('mousedown', function(e){ drawCanvas.addEventListener('mousemove', onmove); });
				drawCanvas.addEventListener('mouseup', function(e){ drawCanvas.removeEventListener('mousemove', onmove); });
				
				var img = this;
				
				//resize
				nbseams.addEventListener('change', function(){
					var slices = this.value * 1; //workaround weird safari bug
					//var slices = -1;
					var width = seamCanvas.width;
					seamCanvas.width =	width + slices;
					
					var imageData = orgCtx.getImageData(0,0, width, seamCanvas.height); //considered DOM...
					var masks = drawCtx.getImageData(0,0, width, seamCanvas.height);
					var out = seamCtx.createImageData(width + slices, seamCanvas.height);
					var d = seamCtx.createImageData(width + (slices > 0 ? (0) : slices + 1), seamCanvas.height);
					
					if(USE_WORKER){
						var start = new Date().getTime();
						
						seampanel.className = "panel loading";
						
						worker.onmessage = function(event){
							var res = event.data;
							for(var i = 0; i < out.data.length; i++)
								out.data[i] = res.data[i];
							
							//copy result in imageData
							seamCtx.putImageData(out, 0,0);
							orgCanvas.style.width = width + slices + "px";
							drawCanvas.style.width = width + slices + "px";
							
							seampanel.className = "panel";
							
							var end = new Date().getTime();
							console.log("finished: %ss", (end - start) / 1000);
						}
					
						// ImageData are considered DOM elements, we can't use them in WebWorker
						// We create a ImageData like object
						var coincoinIN = {'data': imageData.data, 'width': imageData.width, 'height': imageData.height};
						var coincoinOUT = {'data': out.data, 'width': out.width, 'height': out.height};
						var coicoinMASKS = {'data': masks.data, 'width': masks.width, 'height': masks.height};
					
						worker.postMessage({'f': 'resize', 'imageData': coincoinIN, 'masks': coicoinMASKS, 'out':coincoinOUT});
					}
					else{
						var start = new Date().getTime();
						
						seampanel.className = "panel loading";
						
						var s = new SeamCarving(imageData, masks, out);						
						s.resize();
						
						sobelCanvas.width = seamCanvas.width;
						grayCanvas.width = seamCanvas.width;
						energyCanvas.width = seamCanvas.width;
											
						grayCtx.putImageData(s.debug(d, 0), 0,0);
						sobelCtx.putImageData(s.debug(d, 2), 0,0);
						energyCtx.putImageData(s.debug(d, 1), 0,0);
						seamCtx.putImageData(s.out, 0,0);
					
						orgCanvas.style.width = width + slices + "px";
						drawCanvas.style.width = width + slices + "px";
						
						seampanel.className = "panel";
						
						var end = new Date().getTime();
						console.log("finished: %ss", (end - start) / 1000);
					}
				});
				
				//delete selection
				deletebtn.addEventListener('click', function(){
					
					var width = seamCanvas.width;
					
					var out = seamCtx.createImageData(width, img.height);
					var imageData = orgCtx.getImageData(0,0, width, img.height);
					var masks = drawCtx.getImageData(0,0, width, img.height);
					
					if(USE_WORKER){	
						var start = new Date().getTime();	
						
						seampanel.className = "panel loading";
								
						worker.onmessage = function(event){
							var res = event.data;
							for(var i = 0; i < out.data.length; i++)
								out.data[i] = res.data[i];
							
							seamCtx.putImageData(out, 0,0);
							
							seampanel.className = "panel";
							
							var end = new Date().getTime();
							console.log("finished: %ss", (end - start) / 1000);
						}
					
						var coincoinIN = {'data': imageData.data, 'width': imageData.width, 'height': imageData.height};
						var coincoinOUT = {'data': out.data, 'width': out.width, 'height': out.height};
						var coicoinMASKS = {'data': masks.data, 'width': masks.width, 'height': masks.height};
						worker.postMessage({'f': 'erase', 'imageData': coincoinIN, 'masks': coicoinMASKS, 'out':coincoinOUT});
					}
					else{
						var start = new Date().getTime();
						
						seampanel.className = "panel loading";
									
						var s = new SeamCarving(imageData, masks, out);
						s.erase();
					
						var d = seamCtx.createImageData(width, seamCanvas.height);
						grayCtx.putImageData(s.debug(d, 0), 0,0);
						sobelCtx.putImageData(s.debug(d, 2), 0,0);
						energyCtx.putImageData(s.debug(d, 1), 0,0);
					
						seamCtx.putImageData(s.out, 0,0);
						
						seampanel.className = "panel";
						
						var end = new Date().getTime();
						console.log("finished: %ss", (end - start) / 1000);
					}
				});
			});
		});
	})()