/**
* Seam carving -- refactored from
* http://labs.pimsworld.org/wp-content/uploads/2009/04/demo-content-aware-image-resizing-2/
*/
var SeamCarving = function(orgImgData, masks, out){
	//original imaged
	this.original = orgImgData;
	//resized image
	this.out = out;
			
	this._currentWidth = this.original.width;
	this._currentHeight = this.original.height;
	this._currentdata = this.original.data; // current resize step RGBA
	this._tmp = [];	// current step gray + energy + sobel + seam
	
	this._masks = masks.data
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
		
		//poor idea, blows up contour detection
		//this._equalize();
		
		this._sobelAndEnergy();
	},
		
	/**
	* Create grayscale image
	*/
	_desaturate: function(){
		var pixel,
			outImgData = this._tmp,
			srcImgData = this._currentdata,
			
			l = srcImgData.length;
	
		for (pixel = 0; pixel < l; pixel += 4)
			outImgData[pixel] = Math.round((299 * srcImgData[pixel] + 587 * srcImgData[pixel + 1] + 114 * srcImgData[pixel + 2]) / 1000);
	},
	
	/**
	* build sobel and energy map
	*/
	_sobelAndEnergy: function(){
		var width = this._currentWidth, 
					height = this.__currentHeight,
					data = this._tmp,
					masks = this._masks,
     
		sobelPixelH, sobelPixelV, sobelResult,
		topLeft, topMiddle, topRight, bottomLeft, bottomMiddle, bottomRight, leftMiddle, rightMiddle,
		
		pixel,
		minEnergy,
		
		p,
		
		l = data.length;
		
		for (pixel = 0; pixel < l; pixel += 4) {
				
			topLeft =      pixel - (width + 1) * 4;
			topMiddle =    pixel - (width    ) * 4;
			topRight =     pixel - (width - 1) * 4;
			
			bottomLeft =   pixel + (width - 1) * 4;
			bottomMiddle = pixel + (width    ) * 4;
			bottomRight =  pixel + (width + 1) * 4;
			
			leftMiddle =   pixel - 4;
			rightMiddle =  pixel + 4;

			// simple discrete derivative
			/*
			sobelResult = Math.abs(-1 * (data[topMiddle] || 0) + 1 * (data[bottomMiddle] || 0))
						  + Math.abs(-1 * (data[leftMiddle] || 0) + 1 * (data[rightMiddle] || 0));
			sobelResult /= 40;
			*/
			
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
				Math.round(Math.sqrt((sobelPixelV* sobelPixelV)+(sobelPixelH * sobelPixelH)) / 40);
						
			sobelResult = Math.max(sobelResult, masks[pixel + 1]);

			 if(!this._ignoreRED) 
				sobelResult = Math.min(sobelResult, masks[pixel]);
									
			minEnergy = Math.min(data[topLeft+1], data[topMiddle+1], data[topRight+1]);
			minEnergy = isNaN(minEnergy) ? sobelResult : minEnergy + sobelResult;
			
			//force the minimal seam to be in the red area
			if(!this._ignoreRED)
				minEnergy += masks[pixel];
									
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
		var tmp = this._tmp,
			ddata = dest.data,
			l = tmp.length;
		for(var pixel = 0; pixel < l; pixel += 4){
			ddata[pixel] = ddata[pixel + 1] = ddata[pixel + 2] = tmp[pixel + mod];
			ddata[pixel + 3] = tmp[pixel + 3];
		}
		return dest;
	},
	
	_seamMap:function(seam){
		var data = seam.pixels,
			tmp = this._tmp,
			l = data.length;
			
		for(var i = 0; i < l; i++)
			tmp[data[i] + 3] = 0;
	},
	
	//restrict == take only seam crossing the red area
	_getSeam: function(from, restrict) {
		
		var CANAL = 1;
		
		var minEnergyPosition,
		tmpEnergy = Number.MAX_VALUE,
		currentWidth = this._currentWidth,
		currentHeight = this._currentHeight,
		pseudoImgData = this._tmp,
		masks = this._masks,
		topLeftPosition, topMiddlePosition, topRightPosition,topLeftValue, topMiddleValue, topRightValue,
		minEnergyValue,

		pixel,
		pixels = [],
		x, y,
		pos = 0,
		hasRED = false;

		var seamPixels = this._seamsPixels;
		minEnergyPosition = from;
		tmpEnergy = pseudoImgData[from + CANAL];
				
		pixels[pos++] = minEnergyPosition;
			
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
			pixels[pos++] = minEnergyPosition;
			
			if(masks[minEnergyPosition] == 0)
				hasRED = true,
			
			// We assume that this function is called with low energy pixels first
			if(minEnergyValue == Number.MAX_VALUE){
				//ignore overlapping seams
				console.warn("overlapping seam");
				return null;
			}
			
			//store seams position
			seamPixels[minEnergyPosition + 3] = 0;
		}
		
		if(restrict && !hasRED) 
			return null;
			
		return { 'pixels' : pixels, 'energy' : tmpEnergy };
	},
	
	_seamsList: function(restrict){
		
		this._seamsPixels = [];
		
		var currentL = this._currentdata.length;

		for(var i = 0; i < currentL; i++)
			this._seamsPixels[i] = 255;
				
		var currentWidth = this._currentWidth,
			currentHeight = this._currentHeight,
			pixel = 0,
			//sort bottom pixels by energy
			sortedPixels = [],
			tmp = this._tmp,
			x = this._currentWidth,
			pos = 0;
		
		while(--x){ // for some reason we got better results if we start by the end of the image...
			pixel = ((currentHeight - 1) * currentWidth + x) * 4;
			sortedPixels[pos++] = {'index': pixel, 'energy': tmp[pixel + 1]}
		}
		
		sortedPixels.sort(function(p1, p2){
			if(p1.energy < p2.energy) return -1;
			else return 1;
		});
				
		var seams = [],
			l = sortedPixels.length;
			
		pos = 0;		
		for(var x = 0; x < l ; x++) {
			pixel = sortedPixels[x];
			var s = this._getSeam(pixel.index, restrict);
			if(s != null)
				seams[pos++] = s;
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
			srcMasks = this._masks,
			resultMasks = [],
			resultImageData = [];
		
		var pos = 0, l = srcImgDataData.length;		
		for(var i = 0; i < l; i+=4){
			if(srcSeamMapData[i + 3]  > 0){
				for(var j = 0; j < 4; j++){
					resultImageData[pos] = srcImgDataData[i + j];
					resultMasks[pos] = srcMasks[i + j];
					pos++;
				}
			}
		}
		
		this._currentWidth--;
		this._currentdata = resultImageData;
		this._masks = resultMasks;
	},
	
	_addSeam: function(){
		var srcImgData = this._currentdata,
			srcSeamMapData = this._tmp,
			srcMasks = this._masks,
			resultMasks = [],
			resultImageData = [],
		
			left,
			right,
			m,
			ind,
			pos = 0,
			l = srcImgData.length;
		
		for(var i = 0; i < l; i+=4){
			//We found a SEAM!
			if(!(srcSeamMapData[i + 3]  > 0)){
				for(var j = 0; j < 3; j++){
					ind = i + j;
					left = (ind - 4) > 0 ? ind - 4 : ind;
					right = (ind + 4) < srcImgData.length ? ind + 4 : ind;
					m = (srcImgData[left] + srcImgData[right] + srcImgData[ind]) / 3;
					
					resultImageData[pos] = m;	
					resultMasks[pos++] = (srcMasks[left] + srcMasks[right] + srcMasks[ind]) / 3;
				}				
				resultImageData[pos++] = 255; //alpha
			}
			
			for(var j = 0; j < 4; j++){
				resultImageData[pos] = srcImgData[i + j];
				resultMasks[pos++] = srcMasks[i + j];
			}
		}
		
		this._currentWidth = (resultImageData.length) / 4 / this._currentHeight;
		this._currentdata = resultImageData;
		this._masks = resultMasks;
	},
	
	_equalize: function(){
		//http://en.wikipedia.org/wiki/Histogram_equalization
		var tmp = this._tmp, pmap = [];
		
		for(var i = 0; i < 256; i++) pmap[i] = 0;
		for(var i = 0; i < tmp.length; i+=4) 
			pmap[Math.round(tmp[i])]++;
		
		var cdfmap = [], current = 0;
		for(var i = 0; i < pmap.length; i++) 
			cdfmap[i] = (current += pmap[i]);
		
		var h = this._currentHeight, 
			w = this._currentWidth;
				
		var min = Math.min.apply(Math,cdfmap);
		for(var p = 0; p < tmp.length; p += 4){
			var v = Math.round(tmp[p]);
			var r = cdfmap[v] - min;
		 	r /= (h * w - min);
			r *= 255;
			tmp[p] = r;
		}
	},
	
	resize: function(){
		//invert red
		var masks = this._masks,
			l = masks.length;
		
		this._ignoreRED = true;	
		for(var i = 0; i < l; i+=4){
			if(masks[i] > 0)
				masks[i] = 0;
			else 
				masks[i] = 255;
		}
		
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
			for(var i = 0; (i < 35) && (i < diff) && (i < l.length); i++)
				this._seamMap(l[i]);
			this._addSeam();
		}
		
		//copy result
		l = this.out.data.length;
		for(var i = 0; i < l; i++)
			this.out.data[i] = this._currentdata[i];
	},
		
	erase: function(){
		
		var masks = this._masks,
			currentX = 0,
			maxX = 0,
			minX = Number.MAX_VALUE,
			width = this.original.width;
		
		//invert mask and count slices to delete	
		for(var i = 0; i < masks.length; i+=4){
			if(masks[i] > 0)
				masks[i] = 0
			else 
				masks[i] = 255;
		}
		
		while(true){
			this._process();
			var l = this._seamsList(true);
			if(l.length < 1) break; //nothing else to deletes
			this._seamMap(l[0]);
			this._sliceSeam();
		}
		
		this._ignoreRED = true;		
		
		//bigger
		this.resize();
	
	}
}
