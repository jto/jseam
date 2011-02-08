importScripts('seam.js');

onmessage = function(event){
	var s = new SeamCarving(event.data.imageData, event.data.masks, event.data.out);	
	if(event.data.f == 'resize') s.resize();
	else if(event.data.f == 'erase') s.erase();
	postMessage(s.out)
} 