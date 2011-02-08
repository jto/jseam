/*
SEARCHING FOR $
a C64 Ajax throbber, by Mr Speaker
VERSION 1.0

To use: include the LOAD.js script somewhere in your document:

    <script src="LOAD.js" type="text/javascript"></script>

When you are doing your futuristic AJAX calls, or generally letting the user
know to wait up a bit, you can display the beautiful C64 loading screen
by issuing the command:

    LOAD("*",8,1);
    
All things must come to an end, so after loading has completed, interupt the raster
display by issuing the command:

    RUNSTOP();
    
Like the C64 itself, "SEARCHING FOR $" is a powerful little beast. If you want
to get your hands dirty there a few options hidden under the hood. Would you 
care to change the screen display? Simply PRINT your message to the world.
If you supply a "true" for the EOL paramenter, then you get a LINE FEED added:

    PRINT( "Your message", true )
    PRINT( "on the screen" )
    
By default, the loader will take over the whole screen - this is because the 
default container is the screen's "body" element. If you want to change this
you can either specify your container element in the LOAD call:

    LOAD("#myDiv",8,1)
    
(Note: The final paramenter to the LOAD command sets the Z-INDEX of the container.)
Alternatively, you could use the super-elite POKE and PEEK methods to read 
and write memory locations. The CONTAINER element is at ROM location 0:
    
    POKE(0,"#myDiv")
    
If you want to read this value back - you can PEEK at it:
    
    PRINT(PEEK(0))
    
The RAM bank is stored from memory location 49152 (decimal), so if you want to 
adjust RAM properties you'll have to start from there. If you are accessing
RAM muliple times it may be convienent to store the offset location in a
variable:

    V=49152
    PRINT(PEEK(V+4))
    POKE(V+4,1)
    
To make things more fun, the memory banks are not fully documented. 
However, here are some known locations:

ROM BANK:
    00: Screen container element
    01: Default loading message
    02: Colour pallette array
    04: ?
    06: Effect speed
    
RAM BANK:
    03: Colour pallette length variable
    04: ?
    07: Effect is running

    14: Background raster lines DOM element
    15: Foreground screen DOM element
--------
LOADING
READY.
LIST
*/
(function(){
var ROM=["body","LOAD\"*\",8,1<br/>SEARCHING<br/>LOADING<br/>",
        '#7c70da|#aaa|#000|#fff|#894036|#7abfc7|#8a46ae|#68a941|#3e31a2|#d0dc71|#905f25|#5c4700|#b76|#555|#808080|#ae8'.split('|'),
        ,1,,100,,,,0,8,0,,,1.5,,"10%",8,12,null,null,null],
    RAM=[,,ROM[2].length,ROM[2].length,0,0,0,0,null,""],
    ADD=function(DATA, SCREEN){
        var SPRITE=document.createElement('div');
        for(var LDA in DATA) SPRITE.style[LDA] = DATA[LDA];
        if(SCREEN) SCREEN.appendChild(SPRITE);
        return SPRITE;
    },
    SYS=function(){
        RAM[0x7]=1;
        RAM[0x8]=document.querySelector(ROM[0]);
        RAM[0x9]=RAM[0x8].style.overflow;
        RAM[0x8].style.overflow = "hidden"
        if(ROM[0]=="body"){window.scroll(0,0)};
        ROM[0x14]=ADD({
            position:'absolute',overflow:'hidden',top:0,bottom:0,left:0,right:0,
            background:ROM[2][ROM[12]],display:"block !important",zIndex:ROM[4]
        }, RAM[0x8]);
        ROM[0x15]=ADD({
            position:'absolute',overflow:'hidden',font:ROM[0xf]+'em courier',
            top:ROM[17],bottom:ROM[17],left:ROM[17],right:ROM[17],
            color:ROM[2][ROM[10]],backgroundColor:ROM[2][ROM[11]],
            paddingLeft:"3px",zIndex:ROM[4]+1
        }, RAM[0x8]);
        ROM[0x15].innerHTML = RAM[0]||ROM[1];
        ROM[0x16]=setInterval(function(){IRQ();},ROM[6]);
    },
    RET=function() {
        clearInterval(ROM[0x16]);
        ROM[0x15].parentNode.removeChild(ROM[0x15]);
        var LDA=ROM[0x13],
            BNE=function(){
                setTimeout(function(){
                    if(LDA--){
                        ROM[0x14].style.opacity=LDA/ROM[0x13];
                        BNE();
                    }
                    else{
                        RAM[0x7]=0;
                        ROM[0x14].parentNode.removeChild(ROM[0x14]);
                        RAM[0x8].style.overflow = RAM[0x9];
                    }
                }, 20);
            };
        BNE();
    },
    IRQ=function(){
        var X,Y,I,A=0,RASTER,COL,HEIGHT;
        if(ROM[0x5]++<=ROM[0x12]){return;} // Initial delay
        while(ROM[0x14].firstChild) ROM[0x14].removeChild(ROM[0x14].firstChild);
        if(Math.random()<(RAM[4]?0.03:0.07)) RAM[4]=!RAM[4];
        // Mode 1: blinking background
        if(RAM[4]){
            if(!(ROM[0x5]%5)) ROM[0x14].style.backgroundColor=ROM[2][~~(Math.random()*RAM[2])];
            // And choose some new settings for mode 2
            X=Math.random()<0.5;
            RAM[3]=X?RAM[2]:3;
            RAM[0x6]=X?0:~~(Math.random()*(RAM[2]-3));
            return;
        }
        // Mode 2: strobe like it's 1984
        Y=parseInt(window.getComputedStyle(ROM[0x14], null)["height"],10);
        while(A<Y){
            for(I=RAM[2];I--;){
                COL=ROM[2][(I+ROM[0x5])%RAM[3]+RAM[0x6]];
                HEIGHT=~~(Math.random()*3)+2*4;
                A+=HEIGHT;
                // Add the raster bar & glitch bar
                RASTER=ADD({ width: "100%", position: "relative", backgroundColor:COL, height:HEIGHT + "px" });
                ADD({ 
                    position: "absolute", height: "4px", backgroundColor:COL,
                    right:0,top:"-4px",left:(Math.random()>0.9?(RAM[2]-I)*9:0)+'%'
                }, RASTER);
                ROM[0x14].appendChild(RASTER);
            }
        }
    },
    NOP = function(){};
      
    /***** MR SPEAKER BASIC X2 *****/
    this.PEEK=function(MEM){return MEM>49152?RAM[MEM-49152]:ROM[MEM];};
    this.POKE=function(MEM, VAL){
        if(MEM>49152)
            RAM[MEM-49152]=VAL;
        else
            ROM[MEM] = VAL;
    };
    this.PRINT=function(MSG,EOL){
        if(MSG=="CLRHOME")
            RAM[0]="";
        else{
            if(!RAM[0])RAM[0]="";
            RAM[0]+=MSG+(EOL?"<br/>":"");
            if(ROM[0x16])ROM[0x15].innerHTML+=MSG+(EOL?"<br/>":"");
        }
    };
    this.LOAD=function(FILE,DRV,SECTOR){
        var V=49152;
        if(PEEK(V+7))return;
        
        if(FILE!=="*"&&FILE!=="$"){
            if(document.querySelector(FILE)===null){
                alert("?FILE NOT FOUND   ERROR");
                return;
            }
            ROM[0]=FILE;
        } else {
            ROM[0]="body";
        }
        if(DRV!=8){
            alert("?DEVICE NOT PRESENT   ERROR");
            return;
        }
        ROM[5]=SECTOR?SECTOR:ROM[5];
        SYS(49152);
    };
    this.RUNSTOP=function(){
        var V=49152;
        if(!PEEK(V+7))return;
        RET();
    };
})();