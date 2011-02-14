// from http://29a.ch/2010/3/31/simulating-fire-using-javascript-and-canvas
jQuery(function($){
function getNoise(w, h){
    var canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    var img = ctx.createImageData(w, h);
    var n = w*h*4;
    for(var i = 0; i < n; i+=4)
    {
        img.data[i] = 15;
        img.data[i+1] = 3;
        img.data[i+2] = 1;
        img.data[i+3] = Math.floor(Math.random()*128);
    }
    ctx.putImageData(img, 0, 0);
    ctx.drawImage(canvas, 0, 0, w*64, h*64);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(canvas, 0, 0, w*16, h*16);
    var img = ctx.getImageData(0, 0, w, h);
    // increase contrast a bit by clamping values
    for(var i = 3; i < w*h*4; i += 4){
        if(img.data[i] > 220){
            img.data[i] = 255;
        }
        if(img.data[i] < 40){
            img.data[i] = 0;
        }
    }
    ctx.putImageData(img, 0, 0);


    return canvas;
}

var MouseTracker = function(obj) {
    this.x = 0;
    this.y = 0;
    var self = this;
    var o = $(obj).offset();
    var registration = $(obj).mousemove(function(e){
        self.x = e.pageX-o.left;
        self.y = e.pageY-o.top;
    });
}


var y = 0;
function process() {
    // cooldown factor
    ctx.globalAlpha = 0.35;
    ctx.globalCompositeOperation = 'source-over';
    // movement speed of cooldown map
    y = (y+3)%noise.height;
    // flickering of cooldown map
    x = Math.round(Math.random()*5)*0;
    ctx.drawImage(noise, x, y);
    ctx.drawImage(noise, x, y-noise.height);

    // spread of the flame
    ctx.globalAlpha = 1.0;
    // whind
    x = 1-Math.random()*2;
    // move flame up
    ctx.drawImage(canvas, x, -1);
    ctx.globalAlpha = 0.13;
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(canvas, x, -1);

    // heat it up
    ctx.globalAlpha = 0.22;
    ctx.drawImage(heat, 0, 0);
    ctx.fillStyle = fireColor;
    ctx.beginPath();
    ctx.globalAlpha = 0.22;
    ctx.arc(mouseTracker.x, mouseTracker.y, 6, 0, Math.PI*2, false);
    ctx.closePath();
    ctx.fill();

}

function getHeatMap(w, h, text, font, color) {
    var canvas = document.createElement('canvas');
   	canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.font = font;
    var m = ctx.measureText(text);
    var x = (w-m.width)/2;
    var y = h/2;
    ctx.fillText(text, x, y);	
    return canvas;
}

var canvas = document.getElementById('fire');
var ctx = canvas.getContext('2d');
ctx.fillRect(0, 0, canvas.width, canvas.height);
var fireColor = 'rgb(255, 56, 8)';
var heat = getHeatMap(canvas.width, canvas.height, 'Serious Business ?', '60px Impact', fireColor);
var noise = null;
var mouseTracker = new MouseTracker(canvas);
ctx.drawImage(heat, 0, 0);

canvas.onclick = function() {
    // delay generating of the noise texture so it doesn't affect blog
    // performance
    noise = getNoise(canvas.width, canvas.height);
    window.setInterval(process, 33);
}

});
