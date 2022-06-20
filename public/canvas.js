Error.stackTraceLimit = Infinity;
let canvas = document.querySelector('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});


let c = canvas.getContext("2d");
let k = 0;

class CirclePath{
    constructor(x,y,source) {
        this.radius = 35;
        this.x = x;
        this.y = y;
        this.source = (source) ? source : false;
        this.pc = {x:0,y:0};
        if(this.source) {
            this.pc.x = this.source.x;
            this.pc.y = this.source.y;
        }
        this.draw();
      
    }
    draw() {
        
        if(this.source) {

    
                let stepx = this.x / this.pc.x;
                let stepy = this.y / this.pc.y;
             
                // if(this.pc.x < this.x) { this.pc.x += stepx;} else { this.pc.x -= stepx; }
                // if(this.pc.y < this.y) { this.pc.y += stepy; } else { this.pc.y -= stepy; }
            
                var Angle = Math.atan2(this.y - this.pc.y, this.x - this.pc.x)

                var Per_Frame_Distance = 20; 
                var Sin = Math.sin(Angle) * Per_Frame_Distance;
                var Cos = Math.cos(Angle) * Per_Frame_Distance;

                this.pc.y += Sin;
                this.pc.x += Cos;

                c.beginPath();
        
                c.strokeStyle = `rgba(0,100,150,1)`; 
                c.arc(this.pc.x, this.pc.y, this.radius, Math.PI * 2, false);
                c.stroke();
                if(Math.floor(this.pc.x) != this.x || Math.floor(this.pc.y) != this.y) {
                    this.draw()
                }
        } else {
            c.beginPath();
            c.strokeStyle = `rgba(0,100,150,1)`; 
            c.arc(this.x, this.y, this.radius, Math.PI * 2, false);
            c.stroke();
        }
      
    }
}

function render() {
    // window.requestAnimationFrame(render);
    c.clearRect(0,0,window.innerWidth, window.innerHeight);
     a = new CirclePath(window.innerWidth/2,window.innerHeight/2);
     b = new CirclePath(50,200, a);
     e = new CirclePath(10,150,b);
     d = new CirclePath(200,200, e);
    
   


}
window.requestAnimationFrame(render);