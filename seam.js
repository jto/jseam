/**
* Seam carving -- refactored from
* http://labs.pimsworld.org/wp-content/uploads/2009/04/demo-content-aware-image-resizing-2/
*/
var SeamCarving = function(orgImgData, out){
	//original imaged
	this.original = orgImgData;
	//resized image
	this.out = out;
	
	this._currentWidth = this.original.width;
	this._currentHeight = this.original.height;
	this._currentdata = this.original.data; // current resize step RGBA
	this._tmp = [];	// current step gray + energy + sobel + seam
};

SeamCarving.prototype = {
		
	_process: function(){
		var tmp = this._tmp;
		var l = this._currentdata.length;
		
		//init tmp (black, full opacity)
		for(var pixel = 0; pixel < l; pixel += 4){
			tmp[pixel] = tmp[pixel + 1] = tmp[pixel + 2] = 0;
			tmp[pixel + 3] = 255;
		}
		
		this._desaturate();
		this._sobelAndEnergy();
	},
	
	/**
	* Create grayscale image
	*/
	_desaturate: function(){
		var pixel;
		var outImgData = this._tmp;
		var srcImgData = this._currentdata;
	
		for (pixel = 0; pixel < srcImgData.length; pixel += 4)
			outImgData[pixel] = (299 * srcImgData[pixel] + 587 * srcImgData[pixel + 1] + 114 * srcImgData[pixel + 2])/1000;
	},
	
	/**
	* build sobel and energy map
	*/
	_sobelAndEnergy: function(){
		var width = this._currentWidth, 
		height = this.__currentHeight,
		data = this._tmp,
     
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

			/* simple discrete derivative */
			sobelResult = Math.abs(-1 * (data[topMiddle] || 0) + 1 * (data[bottomMiddle] || 0))
						  + Math.abs(-1 * (data[leftMiddle] || 0) + 1 * (data[rightMiddle] || 0));
			sobelResult /= 80;
			
			/*
			// Vertical Sobel
			sobelPixelV =
					+ 1 * (data[topLeft]     || 0)
					+ 2 * (data[topMiddle]   || 0)  
					+ 1 * (data[topRight]    || 0) 
					- 1 * (data[bottomLeft]  || 0) 
					- 2 * (data[bottomMiddle]|| 0) 
					- 1 * (data[bottomRight] || 0);
					
			//Horizontal Sobel
			sobelPixelH =
				+ 1 * (data[topLeft]     || 0)
				+ 2 * (data[leftMiddle]  || 0)  
				+ 1 * (data[bottomLeft]  || 0) 
				- 1 * (data[topRight]    || 0) 
				- 2 * (data[rightMiddle] || 0) 
				- 1 * (data[bottomRight] || 0);
			sobelResult = 
				Math.sqrt((sobelPixelV* sobelPixelV)+(sobelPixelH * sobelPixelH))/80;
			*/
						
			minEnergy = Math.min(Math.min(data[topLeft+1],data[topMiddle+1]),data[topRight+1]);
			minEnergy = isNaN(minEnergy) ? sobelResult : minEnergy + sobelResult;

			// Should be done by the canvas implementation at the browser level
			// http://www.whatwg.org/specs/web-apps/current-work/multipage/the-canvas-element.html#dom-canvaspixelarray-set
			// if (minEnergy > 255) minEnergy = 255;
			// if (minEnergy < 0) minEnergy = 0;

			data[pixel + 1] = Math.round(minEnergy);
			data[pixel + 2] = sobelResult * 20; //random coef
		}
	},
		
	// Copy intermediate image to dest
	// 0 = grayscale,
	// 1 = energy,
	// 2 = Sobel,
	// 3 = seam
	debug: function(dest, mod){
		var tmp = this._tmp;
		var ddata = dest.data;
		for(var pixel = 0; pixel < tmp.length; pixel += 4){
			ddata[pixel] = ddata[pixel + 1] = ddata[pixel + 2] = tmp[pixel + mod];
			ddata[pixel + 3] = tmp[pixel + 3];
		}
		return dest;
	},
	
	_seamMap:function(seam){
		var data = seam.pixels;
		var tmp = this._tmp;
		for(var i = 0; i < data.length; i++)
			tmp[data[i] + 3] = 0;
	},
	
	_getSeam: function(from) {
		
		var CANAL = 1;
		
		var minEnergyPosition,
		tmpEnergy = Number.MAX_VALUE,
		currentWidth = this._currentWidth,
		currentHeight = this._currentHeight,
		pseudoImgData = this._tmp,
		topLeftPosition, topMiddlePosition, topRightPosition,topLeftValue, topMiddleValue, topRightValue,
		minEnergyValue,

		pixel,
		pixels = [],
		x, y;

		var seamPixels = this._seamsPixels;
		minEnergyPosition = from;
		tmpEnergy = pseudoImgData[from + CANAL];
		
		pixels.push(minEnergyPosition);
			
		for (y = currentHeight - 1; y > 0 ; y--) {
			topLeftPosition =      minEnergyPosition - currentWidth * 4 - 4;
			topMiddlePosition =    minEnergyPosition - currentWidth * 4;
			topRightPosition =     minEnergyPosition - currentWidth * 4 + 4;

			//avoid overlapping as much as we can
			topLeftValue =      seamPixels[topLeftPosition   + 3] > 0 ? pseudoImgData[topLeftPosition   + CANAL] : Number.MAX_VALUE;
			topMiddleValue =    seamPixels[topMiddlePosition   + 3] > 0 ? pseudoImgData[topMiddlePosition + CANAL] : Number.MAX_VALUE;			
			topRightValue =     seamPixels[topRightPosition   + 3] > 0 ? pseudoImgData[topRightPosition  + CANAL] : Number.MAX_VALUE;
						
			minEnergyValue = topMiddleValue;
			minEnergyPosition = topMiddlePosition;

			//Low energy + detect the image left and right borders
			if (topLeftValue < minEnergyValue && ((topMiddlePosition % (currentWidth)) > 0)){
				minEnergyValue = topMiddleValue;
				minEnergyPosition = topLeftPosition;
			}
			if (topRightValue < minEnergyValue && (((topMiddlePosition + 4) % (currentWidth)) > 0)){
				minEnergyValue = topRightValue;
				minEnergyPosition = topRightPosition;
			}
			
			tmpEnergy += minEnergyValue;
			pixels.push(minEnergyPosition);
			
			// We assume that this function is called with low energy pixels first
			if(minEnergyValue == Number.MAX_VALUE){
				//ignore overlapping seams
				console.warn("overlapping seam");
				return null;
			}
			
			//store seams position
			seamPixels[minEnergyPosition + 3] = 0;
		}
		
		return { 'pixels' : pixels, 'energy' : tmpEnergy };
	},
	
	_seamsList: function(){
		
		this._seamsPixels = [];
		for(var i = 0; i < this._currentdata.length; i++)
			this._seamsPixels[i] = 255;
		
		var currentWidth = this._currentWidth,
		currentHeight = this._currentHeight,
		pixel = 0;
		
		//sort bottom pisels by energy
		var sortedPixels = [];
		var tmp = this._tmp;
		//for(var x = 0; x < currentWidth ; x+=5) {
		var x = currentWidth;
		while(x--){
			pixel = ((currentHeight - 1) * currentWidth + x) * 4;
			sortedPixels.push({'index': pixel, 'energy': tmp[pixel + 1]})
		}
		
		sortedPixels.sort(function(p1, p2){
			if(p1.energy < p2.energy) return -1;
			else return 1;
		});
		
		var seams = [];
		for(var x = 0; x < sortedPixels.length ; x++) {
			pixel = sortedPixels[x];
			var s = this._getSeam(pixel.index);
			if(s != null)
				seams.push(s);
		}
		
		//sort seams by energy
		return seams.sort(function(s1, s2){
			if(s1.energy < s2.energy) return -1;
			if(s1.energy)
			return 1;
		});
	},
	
	_sliceSeam: function(){
		var srcImgDataData = this._currentdata,
		srcSeamMapData = this._tmp,
		resultImageData = [];
				
		for(var i = 0; i < srcImgDataData.length; i+=4)
			if(srcSeamMapData[i + 3]  > 0)
				for(var j = 0; j < 4; j++)
					resultImageData.push(srcImgDataData[i + j])
		
		this._currentWidth--;
		this._currentdata = resultImageData;
	},
	
	_addSeam: function(){
		var srcImgData = this._currentdata,
		srcSeamMapData = this._tmp,
		resultImageData = [];
		
		var left, right, m, ind;
		
		for(var i = 0; i < srcImgData.length; i+=4){
			//We found a SEAM!
			if(!(srcSeamMapData[i + 3]  > 0)){
				for(var j = 0; j < 3; j++){
					ind = i + j;
					left = (ind - 4) > 0 ? srcImgData[ind - 4] : srcImgData[ind];
					right = (ind + 4) < srcImgData.length ? srcImgData[ind + 4] : srcImgData[ind];
					m = (left + right + srcImgData[ind]) / 3;
					resultImageData.push(m);
				}
				resultImageData.push(255); //alpha
			}
			
			for(var j = 0; j < 4; j++)
				resultImageData.push(srcImgData[i + j])
		}
		
		this._currentWidth = (resultImageData.length) / 4 / this._currentHeight;
		this._currentdata = resultImageData;
	},
	
	resize: function(){
		//smaller ?
		while(this._currentdata.length > this.out.data.length){
			this._process();
			var l = this._seamsList();
			this._seamMap(l[0]);
			this._sliceSeam();
		}
		
		//bigger
		while(this._currentWidth < this.out.width){
			var diff = this.out.width - this._currentWidth;
			this._process();
			var l = this._seamsList();
			console.log("found: " + l.length);
			for(var i = 0; /*(i < 20) &&*/ (i < diff) && (i < l.length); i++)
				this._seamMap(l[i]);
			this._addSeam();
		}
		
		//copy result
		for(var i = 0; i < this.out.data.length; i++)
			this.out.data[i] = this._currentdata[i];
	}
}
