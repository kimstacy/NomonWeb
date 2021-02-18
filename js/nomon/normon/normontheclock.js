class NormonCanvas{
    constructor(canvas_id, y_offset) {
        this.canvas = document.getElementById(canvas_id);
        this.canvas.style.position = "absolute";
        this.canvas.style.left = "0px";
        this.ctx = this.canvas.getContext("2d");
        this.calculate_size(y_offset);
    }
    calculate_size(y_offset){
        this.canvas.style.top = y_offset.toString().concat("px");
        this.window_width = window.innerWidth;
        this.window_height = window.innerHeight;

        this.resolution_factor = 2;
        this.screen_fill_factor = 0.98;

        this.canvas.width = this.window_width * this.resolution_factor;
        this.canvas.height = this.window_height*this.resolution_factor;
        this.canvas.style.width = (this.window_width * this.screen_fill_factor).toString().concat("px");
        this.canvas.style.height = ((this.window_height) * this.screen_fill_factor).toString().concat("px");

        this.screen_width = this.window_width * this.resolution_factor;
        this.screen_height = (this.window_height) * this.resolution_factor;
    }
}

class Eye {
    constructor(canvas, x_rel, y_rel, size, parent) {
        this.parent = parent;
        this.canvas = canvas;
        this.x_rel = x_rel;
        this.x_base = x_rel;

        this.y_rel = y_rel;
        this.y_base = y_rel;

        this.r_rel = 0;
        this.r_base = 0;

        this.x_vel = 0;
        this.y_vel = 0;
        this.r_vel = 0;

        this.size = size;
        this.redraw()
    }
    redraw(){
        this.canvas.ctx.lineWidth = this.size / 5;
        this.canvas.ctx.beginPath();
        this.canvas.ctx.lineCap = "round";
        this.canvas.ctx.strokeStyle = "#000000";

        this.canvas.ctx.ellipse(this.parent.x_pos+this.x_rel, this.parent.y_pos+this.y_rel, this.size*0.14, this.size*0.2, this.r_rel, 0, 2 * Math.PI);
        this.canvas.ctx.fillStyle = "#000000";
        this.canvas.ctx.fill();

        this.canvas.ctx.beginPath();
        this.canvas.ctx.arc(this.parent.x_pos+this.x_rel-this.size*0.01, this.parent.y_pos+this.y_rel-this.size*0.05, this.size*0.07, 0, 2 * Math.PI);
        this.canvas.ctx.fillStyle = "#ffffff";
        this.canvas.ctx.fill();

    }
    compute_motion(){
        var rel_angle = Math.atan(this.y_rel/this.x_rel);
        var rad = Math.sqrt(this.x_rel**2 + this.y_rel**2);

        if (rad > this.size*0.69){
            // outer rotational vel
            if (this.x_rel > 0) {
                this.x_vel = -this.parent.r_vel * rad * Math.sin(rel_angle);
                this.y_vel = this.parent.r_vel * rad * Math.cos(rel_angle);
            } else {
                this.x_vel = this.parent.r_vel * rad * Math.sin(rel_angle);
                this.y_vel = -this.parent.r_vel * rad * Math.cos(rel_angle);
            }

            this.r_vel = this.parent.r_vel*1.5;

        }

        if (this.y_rel < Math.sqrt((this.size*0.7)**2-this.x_rel**2)){
            this.y_vel += this.parent.gravity;
        } else {
            this.x_vel += -this.parent.gravity*Math.sin(this.x_rel/(this.size*0.8)*2*Math.PI);
        }


        this.x_rel += this.x_vel + Math.random()*1;
        this.y_rel += this.y_vel + Math.random()*1;
        this.r_rel += this.r_vel + Math.random()*0.05;

        if (Math.sqrt(this.x_rel**2 + this.y_rel**2) > (this.size*0.7)){
            var scale = (this.size*0.7)/Math.sqrt(this.x_rel**2 + this.y_rel**2);
            this.x_rel *= scale;
            this.y_rel *= scale;
        }
    }
    compute_return(){
        this.x_vel = 0.2*(this.x_base-this.x_rel);
        this.y_vel = 0.2*(this.y_base-this.y_rel);
        this.r_vel = 0.2*(this.r_base-this.r_rel);

        this.x_rel += this.x_vel;
        this.y_rel += this.y_vel;
        this.r_rel += this.r_vel;
    }
}


class Eyebrow {
    constructor(canvas, x_rel, y_rel, size, left, parent) {
        this.parent = parent;
        this.left = left;
        this.canvas = canvas;
        this.x_rel = x_rel;
        this.x_base = x_rel;

        this.y_rel = y_rel;
        this.y_base = y_rel;

        this.r_rel = 0;
        this.r_base = 0;

        this.x_vel = 0;
        this.y_vel = 0;
        this.r_vel = 0;

        this.size = size;
        this.redraw()
    }
    redraw(){
        this.canvas.ctx.lineWidth = this.size / 10;
        this.canvas.ctx.beginPath();
        this.canvas.ctx.lineCap = "round";
        this.canvas.ctx.strokeStyle = "#000000";

        if (this.left) {
            this.canvas.ctx.arc(this.parent.x_pos + this.x_rel + this.size * 0.15, this.parent.y_pos + this.y_rel + this.size * 0.15, this.size * 0.25, -2.7, -1.7);
        }
        else {
            this.canvas.ctx.arc(this.parent.x_pos + this.x_rel - this.size * 0.15, this.parent.y_pos + this.y_rel + this.size * 0.15, this.size * 0.25, -1.5, -0.5);
        }
        this.canvas.ctx.stroke();

    }
    compute_motion(){
        var rel_angle = Math.atan(this.y_rel/this.x_rel);
        var rad = Math.sqrt(this.x_rel**2 + this.y_rel**2);

        if (rad > this.size*0.69){
            // outer rotational vel
            if (this.x_rel > 0) {
                this.x_vel = -this.parent.r_vel * rad * Math.sin(rel_angle)*1.1;
                this.y_vel = this.parent.r_vel * rad * Math.cos(rel_angle)*1.1;
            } else {
                this.x_vel = this.parent.r_vel * rad * Math.sin(rel_angle)*1.1;
                this.y_vel = -this.parent.r_vel * rad * Math.cos(rel_angle)*1.1;
            }


        }

        if (this.y_rel < Math.sqrt((this.size*0.7)**2-this.x_rel**2)){
            this.y_vel += this.parent.gravity;
        } else {
            this.x_vel += -this.parent.gravity*Math.sin(this.x_rel/(this.size*0.8)*2*Math.PI);
        }


        this.x_rel += this.x_vel + Math.random()*1;
        this.y_rel += this.y_vel + Math.random()*1;
        this.r_rel += this.r_vel + Math.random()*0.05;

        if (Math.sqrt(this.x_rel**2 + this.y_rel**2) > (this.size*0.7)){
            var scale = (this.size*0.7)/Math.sqrt(this.x_rel**2 + this.y_rel**2);
            this.x_rel *= scale;
            this.y_rel *= scale;
        }
    }
    compute_return(){
        this.x_vel = 0.3*(this.x_base-this.x_rel);
        this.y_vel = 0.3*(this.y_base-this.y_rel);
        this.r_vel = 0.3*(this.r_base-this.r_rel);

        this.x_rel += this.x_vel;
        this.y_rel += this.y_vel;
        this.r_rel += this.r_vel;
    }
}


class Normon {
    constructor(canvas, x_pos, y_pos, radius) {
        this.canvas = canvas;
        this.x_pos = x_pos;
        this.y_pos = y_pos;
        this.radius = radius;
        this.angle = 0.5;

        this.draw_face();
        this.draw_hand();
        this.left_eye = new Eye(canvas, -radius*0.35, -radius*0.3, radius, this);
        this.right_eye = new Eye(canvas, +radius*0.35, -radius*0.3, radius, this);

        this.left_eyebrow = new Eyebrow(canvas, -radius*0.47, -radius*0.55, radius, true, this);
        this.right_eyebrow = new Eyebrow(canvas, radius*0.47, -radius*0.55, radius, false, this);

        this.r_vel = 0.0;
        this.x_vel = 0.0;
        this.gravity = 1;

        this.start_time= Date.now();
        this.pause_length = 3000;
        this.period = 7000;
    }
    draw_face() {
        this.canvas.ctx.beginPath();
        this.canvas.ctx.clearRect(this.x_pos - this.radius*1.3, this.y_pos - this.radius*1.3,
                    this.radius * 2.6, this.radius * 2.6);

        this.canvas.ctx.arc(this.x_pos, this.y_pos, this.radius, 0, 2 * Math.PI);
        this.canvas.ctx.fillStyle = "#ffffff";
        this.canvas.ctx.fill();

        this.canvas.ctx.strokeStyle = "#0056ff";

        this.canvas.ctx.lineWidth = this.radius / 5;
        this.canvas.ctx.stroke();

    }
    draw_hand() {
        if (this.angle > Math.PI * 2) {
            this.angle = this.angle % Math.PI * 2;
        }
        this.canvas.ctx.beginPath();
        this.canvas.ctx.lineCap = "round";

        var angle_correction = 0;
        this.canvas.ctx.moveTo(this.x_pos + Math.cos(this.angle - angle_correction) * this.radius * 0.7,
            this.y_pos + Math.sin(this.angle - angle_correction) * this.radius * 0.7);
        this.canvas.ctx.lineTo(this.x_pos - Math.cos(this.angle - angle_correction) * this.radius * 0.0,
            this.y_pos - Math.sin(this.angle - angle_correction) * this.radius * 0.0);

        this.canvas.ctx.strokeStyle = "#0056ff";

        this.canvas.ctx.lineWidth = this.radius / 5;
        this.canvas.ctx.stroke();

        this.canvas.ctx.beginPath();
        this.canvas.ctx.moveTo(this.x_pos, this.y_pos);
        this.canvas.ctx.lineTo(this.x_pos, this.y_pos - this.radius * 0.925);

    }
    compute_motion(){
        this.angle += this.r_vel;
        this.left_eye.compute_motion();
        this.right_eye.compute_motion();

        this.left_eyebrow.compute_motion();
        this.right_eyebrow.compute_motion();

        this.r_vel = 0.12*Math.sin((Date.now()-this.start_time-this.pause_length)*(2*Math.PI)/this.period);
        this.x_vel = this.r_vel*this.radius;
        this.x_pos += this.x_vel;
    }
    compute_return(){
        this.left_eye.compute_return();
        this.right_eye.compute_return();

        this.left_eyebrow.compute_return();
        this.right_eyebrow.compute_return();
    }
    animate(){
        if ((Date.now() - this.start_time) > this.period + this.pause_length){
            this.start_time = Date.now();
        } else if ((Date.now() - this.start_time) > this.pause_length){
            this.compute_motion();
        } else {
            this.compute_return();
        }
        this.draw_face();
        this.draw_hand();
        this.left_eye.redraw();
        this.right_eye.redraw();
        this.left_eyebrow.redraw();
        this.right_eyebrow.redraw();
    }
}
let info_canvas = new NormonCanvas("normon_canvas", 1);

let normon = new Normon(info_canvas, 300, 1000, 100);

setInterval(normon.animate.bind(normon), 20);