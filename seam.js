/**
* Seam carving -- refactored from
* http://labs.pimsworld.org/wp-content/uploads/2009/04/demo-content-aware-image-resizing-2/
*/
var SeamCarving = function(orgImgData, tmp, out){
	
	this.original = orgImgData;
	//R = luminance map, G = borders map, B = energy map, A = nothing
	this.tmp = tmp;
	//resized image
	this.out = out;
	
	this.init();
};

SeamCarving.prototype = {
	init: function(){
		this.desaturate();
		this.sobelAndEnergy();
	},
	
	/**
	* Create grayscale image
	*/
	desaturate: function(){
		var pixel;
		var outImgData = this.tmp.data;
		var srcImgData = this.original.data;
	
		for (pixel = 0; pixel < srcImgData.length; pixel += 4)
			outImgData[pixel] = (299 * srcImgData[pixel] + 587 * srcImgData[pixel + 1] + 114 * srcImgData[pixel + 2])/1000;
	},
	
	/**
	* build sobel and energy map
	*/
	sobelAndEnergy: function(){
		var width = this.tmp.width, 
		height = this.tmp.height,
		data = this.tmp.data,
     
		sobelPixelH, sobelPixelV, sobelResult,
		topLeft, topMiddle, topRight, bottomLeft, bottomMiddle, bottomRight, leftMiddle, rightMiddle,
		
		pixel,
		minEnergy,
		
		p;
		for (pixel = 0; pixel < data.length; pixel += 4) {
				
			topLeft =      pixel - (width + 1) * 4;
			topMiddle =    pixel - (width    ) * 4;
			topRight =     pixel - (width - 1) * 4;
			
			bottomLeft =   pixel + (width - 1) * 4;
			bottomMiddle = pixel + (width    ) * 4;
			bottomRight =  pixel + (width + 1) * 4;
			
			leftMiddle =   pixel - 4;
			rightMiddle =  pixel + 4;

			/* Vertical Sobel */
			sobelPixelV =
				+ 1 * (data[topLeft]     || 0)
				+ 2 * (data[topMiddle]   || 0)  
				+ 1 * (data[topRight]    || 0) 
				- 1 * (data[bottomLeft]  || 0) 
				- 2 * (data[bottomMiddle]|| 0) 
				- 1 * (data[bottomRight] || 0);
			
			/* Horizontal Sobel */
			sobelPixelH =
				+ 1 * (data[topLeft]     || 0)
				+ 2 * (data[leftMiddle]  || 0)  
				+ 1 * (data[bottomLeft]  || 0) 
				- 1 * (data[topRight]    || 0) 
				- 2 * (data[rightMiddle] || 0) 
				- 1 * (data[bottomRight] || 0);
			sobelResult = 
				Math.sqrt((sobelPixelV* sobelPixelV)+(sobelPixelH * sobelPixelH))/80;
			
			minEnergy = Math.min(Math.min(data[topLeft+1],data[topMiddle+1]),data[topRight+1]);
			minEnergy = isNaN(minEnergy) ? sobelResult : minEnergy + sobelResult;
			
			/* Should be done by the canvas implementation at the browser level
			 http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#dom-canvaspixelarray-set
			 if (minEnergy > 255) minEnergy = 255;
			if (minEnergy < 0) minEnergy = 0;*/
			
			data[pixel + 1] = Math.round(minEnergy);
			data[pixel + 2] = sobelResult * 30;
		}
	},
		
	// 0 = grayscale,
	// 1 = sobel
	// 2 = energy
	debug: function(mod){
		var tmp = this.tmp.data;
		var out = this.out.data;
		
		for(pixel = mod; pixel < tmp.length; pixel += 4){
			out[pixel] = out[pixel + 1] = out[pixel + 2] = tmp[pixel];
			out[pixel + 3] = 255;
		}
		
		return this.out;
	}
}
