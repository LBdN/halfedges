/*jshint strict:true */
/*jshint esversion:6 */


import * as p5 from "./node_modules/p5/lib/p5.min.js";
import * as Camera from "./p5.canvascam"
import {Render, rColor} from "./render";
import * as QuickSettings from "quicksettings";


typeof Camera;
Camera.addCamera(p5);

let render;
let HALF_PI =p5.prototype.HALF_PI;
let fill;
let stroke;
let ellipse;
let PI = p5.prototype.PI;
let TWO_PI = p5.prototype.TWO_PI;
let sin;
let tan;
let radians;
let max;
let CLOSE = p5.prototype.CLOSE;
let pp5;




class Stub {
    road : Road
    vector : p5.Vector;
    length : number;
    ptId : number;

    pt : Point;
    start : p5.Vector;
    end : p5.Vector;
    extent : p5.Vector;

    constructor(road, vector, ptId, length){
        this.road = road;
        this.vector = vector;
        this.ptId = ptId;
        this.length = length;
        //==
        this.pt = pool.getPoint(this.ptId);      
        this.extent= this.vector.copy().normalize().mult(this.length);
        this.start = p5.Vector.add(this.vector, this.pt.pos);      
        this.end = p5.Vector.add(this.start, this.extent);
    }
    
    render(){        
        pp5.stroke(255);
        pp5.line(this.start.x, this.start.y, this.end.x, this.end.y);
        let posOffset, negOffset;        
        [posOffset, negOffset] = this.getOffsets();
        render.band(this.start, this.end, posOffset, negOffset);

        
    }
    
    getOffsets(){
        let posOffset = this.vector.copy().normalize().rotate(HALF_PI).mult(this.road.width);
        let negOffset = this.vector.copy().normalize().rotate(-HALF_PI).mult(this.road.width);
        return [posOffset, negOffset];
    }
    
    getDir(){
        return this.vector.copy().normalize();
    }
    
    getPoints(){
        let posOffset, negOffset;        
        [posOffset, negOffset] = this.getOffsets();        
        
        let pts : any = {};
        pts.br =  p5.Vector.add(this.start, posOffset) ;
        pts.tr =  p5.Vector.add(this.end, posOffset) ;
        
        pts.bl = p5.Vector.add(this.start, negOffset) ;
        pts.tl = p5.Vector.add(this.end, negOffset) ;    
        return pts;
    }
    
    getBottomLeft(){
        let start = p5.Vector.add(this.vector, this.pt.pos);
        let left_offset = this.vector.copy().rotate(HALF_PI).normalize().mult(this.road.width);
        return start.add(left_offset);
    }
    
    getBottomRight(){
        let start = p5.Vector.add(this.vector, this.pt.pos);
        let right_offset = this.vector.copy().rotate(-HALF_PI).normalize().mult(this.road.width);
        return start.add(right_offset);
    }
}


class RenderingCorner {
    stub1 : Stub;
    stub2 : Stub;
    intersectionPt : p5.Vector;

    constructor(stub1, stub2, intersectionPt) {
        this.stub1 = stub1;
        this.stub2 = stub2;
        this.intersectionPt = intersectionPt;
        //         
    }
    
    render(){
        let pts1 = this.stub1.getPoints();
        let pts2 = this.stub2.getPoints();      
        let pts = [pts1.tl, this.intersectionPt,  pts2.tr];
        
        pp5.fill(128,128,128,200);
        pp5.stroke(250,0,0,100);
        pp5.ellipse(pts[0].x, pts[0].y, 5);
        pp5.stroke(0, 250,0,100);
        pp5.ellipse(pts[2].x, pts[2].y, 5);
        
        render.band2(pts, roadSetting.pavement,true);        
    }
    
    
}

class Corner{
    from : Road;
    to : Road;
    xroadId : number
    delta : number;
    ratio : number;
    center : p5.Vector;

    constructor(r1, r2, xroadId){
        this.from = r1;
        this.to = r2;
        this.xroadId = xroadId;

        let v1 = this.to.getLengthVector(this.xroadId, 1, false);      
        let v2 = this.from.getLengthVector(this.xroadId, 1, true);    
        

        this.delta = v2.heading() - v1.heading();
        if (this.delta < 0){ this.delta += TWO_PI;}

        this.ratio = (1 / sin(this.delta));
        this.center = pool.getPoint(this.xroadId);       
    }

    getIntersectionPos(){              
        let v1 = this.from.getLengthVector(this.xroadId, this.to.width*this.ratio, true);    
        let v2 = this.to.getLengthVector(this.xroadId, this.from.width*this.ratio, true);              
        let intersectionPt  = p5.Vector.add(v1, v2)

        
        intersectionPt.add(this.center.pos);            
        
        if (this.delta === PI || this.delta === -PI || this.delta == 0){
            let w = max(this.from.width, this.to.width);
            intersectionPt = this.from.edge.getDirFrom(this.xroadId);
            intersectionPt.normalize().rotate(HALF_PI).mult(w).add(this.center.pos);
        }   
        return intersectionPt;
    }

    getOffsetForRoad(r){
        if (r!== this.from && r!== this.to){
            throw "invalid input road";
        }

        // let a = (this.delta > HALF_PI || this.delta < -HALF_PI) ? PI - this.delta : this.delta;
        let projOther = -(r.width/tan(this.delta));
        let other = (r === this.from) ? this.to : this.from;
        let v1 =  r.getLengthVector(this.xroadId, (other.width*this.ratio) + projOther, true);
        // v1.mult(-1);

        return v1;
    }

    render(){
        let v1 = this.to.getLengthVector(this.xroadId, this.from.width, false);    
        let v2 = this.from.getLengthVector(this.xroadId, this.to.width, true);    
        
        
        let txt = (<any>"{0}-{1}-{2} ({3})").format(this.to.edge.getOtherPtId(this.xroadId), this.xroadId, this.from.edge.getOtherPtId(this.xroadId), this.delta.toPrecision(3));
        render.corner(this.center.asVector(), v1, v2, txt);

    }

}

class CrossRoad {
    ptId : number;
    roads : Road[];
    corners : Corner[];
    cornersByRoad : Map<Road, Corner[]>;
    stubs : Map<Road, Stub>;
    rendered_corners : RenderingCorner[];

    constructor(ptId, roads) {
        this.ptId = ptId;
        this.roads = roads;
        //==
        this.corners = [];
        this.cornersByRoad = new Map();              
        this.stubs = new Map();
        this.rendered_corners= [];
        //=
        for (let r of this.roads){
           this.cornersByRoad.set(r, []);
        }  

        this.buildCorners();
    }
    
    buildCorners(){                       
        
        // sort by headings
        let road_headings = [];
        for (let r of this.roads){        
            let v = r.edge.getDirFrom(this.ptId);         
            let a = v.heading();
            if (a < 0) {
                a = TWO_PI + a;
            }
            road_headings.push([r, a, r.id]);

        }
        road_headings.sort((a,b)=> {
            let d = a[1] - b[1]
            return d;
        });        
        
        for (let i of road_headings.keys()){        
            let r1, r2, angle1, angle2;

            [r1, angle1] = road_headings[i];            
            
            let j = (i+1) % road_headings.length;
            [r2, angle2] = road_headings[j];            

            let c = new Corner(r1, r2, this.ptId)
            this.corners.push( c )
            this.cornersByRoad.get(r1).push(c);
            this.cornersByRoad.get(r2).push(c);           
        }

    }
    
    buildRoadStubs(stubs){

        const stubWidth = 20;

        let center = pool.getPoint(this.ptId);
        
        let stubs_info = new Map();
        for (let r of this.roads){
            let offset = pp5.createVector(0,0);
            for (let c of this.cornersByRoad.get(r)){
                let newOffset = c.getOffsetForRoad(r);
                if (newOffset.mag() > offset.mag() && newOffset.mag() < r.length()){
                    offset = newOffset;
                }
            }
            // render.vector( center, offset, RED );
            let s = new Stub(r, offset, this.ptId, stubWidth);
            this.stubs.set(r, s);
            stubs.push(s);       
        }

        for (let c of this.corners){
            if (this.stubs.get(c.to) !== undefined || this.stubs.get(c.from) !== undefined) {
                let rc = new RenderingCorner(this.stubs.get(c.to), this.stubs.get(c.from), c.getIntersectionPos());
                this.rendered_corners.push(rc);
            }
            
        }
    }
    
    render(){            
        
        let pts = [];
        for (let c of this.corners){        
            let intersectionPt = c.getIntersectionPos();
            pts.push([intersectionPt.x,intersectionPt.y]);  
        }

        pp5.fill(128,128,128,30);
        pp5.stroke(25,220,0,50);
        pp5.beginShape();
        for(let p  of pts){             
            // pp5.vertex(...p);  
        }
        pp5.endShape(CLOSE);  
        
        for( let c of this.corners){
            c.render();
        }

        for( let c of this.rendered_corners){
            c.render();
        }
    }
}

class Road {
    edge : Edge;
    width : number;
    id : [number, number];


    constructor(edge, width) {
        this.edge = edge;
        this.width = width;
        this.id = edge.id;
    }

    length(){
        return this.edge.getDir().mag();
    }
    
    render(){    
        var n = this.edge.getNormal();
        //
        var posOffset = p5.Vector.mult(n, this.width );
        var negOffset = p5.Vector.mult(posOffset, -1);
        
        var start, end;
        [start, end ]= this.edge.getPos();        
        
        render.band(start, end, posOffset, negOffset, [100,100,100,100]);
        
        let v = this.edge.getDir();
        let c = v.mult(0.5).add(start);              
        // pp5.text(this.id, c.x, c.y);
    }
    
    getOffsets(){
        var n = this.edge.getNormal();
        var posOffset = p5.Vector.mult(n, this.width );
        var negOffset = p5.Vector.mult(posOffset, -1);
        return [posOffset, negOffset];
    }
    
    getWidthVector(ptId){      
        let v = this.edge.getDirFrom(ptId);
        v.normalize().rotate(p5.radians(90)).mult(this.width);
        return v;
    }
    
    
    getLengthVector(ptId : number, length : number, from : boolean){      
        let v;
        if (from) {
            v = this.edge.getDirFrom(ptId);
        } else {
            v = this.edge.getDirTo(ptId);
        }        
        v.normalize().mult(length);
        return v;
    }
}

class Edge {
    start : number;
    end : number;
    id : [number, number];

    constructor(startId, endId) {
        this.start = startId;
        this.end = endId;
        this.id = [startId, endId];
    }


    getOtherPtId(ptId  : Number){
        return (this.start === ptId) ? this.end : this.start;             
    }
    
    render() {
        var p1 = pool.getPoint(this.start);
        var p2 = pool.getPoint(this.end);
        pp5.stroke(125, 0, 0, 255);
        pp5.line(...p1.pos, ...p2.pos);
    }
    
    getPos() {
        var p1 = pool.getPoint(this.start);
        var p2 = pool.getPoint(this.end);
        return [new p5.Vector(...p1.pos),new  p5.Vector(...p2.pos)];
    }
    
    getDir(){
        let pts = this.getPos();
        return p5.Vector.sub(pts[1], pts[0]);
    }  
    
    getDirFrom(ptId : Number){
        let v = this.getDir();
        if (this.start === ptId) {
            return v;
        }
        v.mult(-1);
        return v;
    }

    getDirTo(ptId  : Number){
        let v = this.getDirFrom(ptId);
        v.mult(-1);
        return v;
    }
    
    getNormal(){
        let pts = this.getPos();
        let v = p5.Vector.sub(pts[1], pts[0]);
        let n = v.rotate(radians(90)).normalize();
        return n;
    }
}

class Point {
    x : number;
    y : number;
    pos : [number, number];
    id : number;

    constructor(x, y, id) {
        this.x = x;
        this.y = y;
        this.pos = [x, y];
        this.id = id;
    }
    
    render() {
        pp5.stroke(255, 0, 255, 255);
        pp5.ellipse(...this.pos, 5, 5);
    }
    
    
    asVector(){
        return pp5.createVector(...this.pos);
    }
}

class GeometryPool {
    pointPool : any;
    edgePool : Map<[number, number], Edge>;
    edges : any;
    edgeArr : Edge[];

    maxPointid : number;
    maxEdgeid : number;

    constructor() {
        this.empty();
    }

    empty(){
        this.pointPool = {};
        this.edgePool = new Map<[number, number], Edge>();
        this.edges = {};
        this.edgeArr = [];
        this.maxPointid = 0;
        this.maxEdgeid = 0;
    }
    
    newPoint(x, y) {
        this.maxPointid += 1;
        let newId = this.maxPointid;
        this.pointPool[newId] = new Point(x, y, newId);
        this.edges[newId] = [];
        return newId;
    }
    
    newEdge(startId : number, endId : number) {
        this.maxEdgeid += 1;
        let newId = this.maxEdgeid;
        let e = new Edge(startId, endId);
        this.edgePool.set([startId, endId], e);
        this.edgePool.set([endId, startId], e);
        this.edgeArr.push(e);
        this.edges[startId].push(endId);
        this.edges[endId].push(startId);
        
        return e;
    }  
    
    getIncomingEdge(ptId){
        let result = [];
        for(let pt2Id of this.edges[ptId] ){
            for (let e of this.edgeArr){
                if (e.start === ptId && e.end === pt2Id){
                    result.push(e);
                }
                if (e.start === pt2Id && e.end === ptId){
                    result.push(e);
                }
            }
        }
        return result;
    }
    
    
    
    getEdge(id) {
        return this.edgePool[id];
    }
    
    getPoint(id) {
        return this.pointPool[id];
    }
    
    
    render(){
        for (var e of Object.keys(pool.edgePool)) {
            pool.edgePool[e].render();
        }
        for (var p of Object.keys(pool.pointPool)) {
            pool.pointPool[p].render();
        }
    }
    
}

let pool :GeometryPool = new GeometryPool();

let roads = new Map<Edge, Road>();
let xroads= new Map<number, CrossRoad>();
let stubs : Stub[] = [];
let ready = false;
let redraw = true;
let cam : any;
let settings : any;

let gridSetting = {
    gridSide : 4,
    startOffset : 200,
    gridCaseSize : 450
};

let roadSetting = {
    min : 73,
    max : 190,
    pavement : 10
};


let pushOver = {    
    length : 20,
};


var sketch = function( p ) {


    fill = (a,b,c,d) => {return p.fill(a,b,c,d)};
    stroke = (a,b,c,d) => {return  p.stroke(a,b,c,d)};
    ellipse =(a,b,c,d) => {return  p.ellipse(a,b,c,d)};    
    sin = (x) => {return p.sin(x)};
    tan = (x) => {return p.tan(x)};
    radians = (x) => {return p.radians(x)};
    max = (x,y) => {return p.max(x,y)};

    pp5 = p;
    render = new Render(p);


    p.dirty = function (options){
        ready=false;
    };

    p.setup = function() {
        'use strict';
        
        var canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        canvas.parent('sketch-holder');
        
        settings = QuickSettings.create(100,100);    

        for (let k of ["gridSide", "startOffset", "gridCaseSize"]) {
            settings.addNumber(k, Math.round(gridSetting[k]/10), Math.round(gridSetting[k]*10), gridSetting[k], 1, (value) => {gridSetting[k] = value;});
        }
        //==
        for (let k of ["min", "max", "pavement"]) {
            settings.addNumber(k, Math.round(roadSetting[k]/10), Math.round(roadSetting[k]*10), roadSetting[k], 1, (value) => {roadSetting[k] = value;});
        }
        
        settings.addNumber("length", 0, 20, pushOver["length"], 1, (value) => {pushOver["length"] = value});
        //
        settings.setGlobalChangeHandler(p.dirty);


        cam = new p.Camera(1, p.width/2, p.height/2 );
    }

    p.mouseDragged = function() {
        let dx = cam.mouseX - cam.pmouseX;
        let dy = cam.mouseY - cam.pmouseY;
        // console.log(dx, dy);    
        cam.translate(-dx, -dy);
        p.clear();
        redraw = true;
    }

    p.mouseWheel = function(e) {
        var factor = Math.pow(1.05, e.delta);
        cam.scale(factor, p.mouseX, p.mouseY, p.width, p.height);
        // clear();
        redraw = true;
    }
    
    p.windowResized = function() {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
        // clear();
        redraw = true;
    }


 

    p.mysetup = function() {

        roads = new Map<Edge, Road>();
        xroads= new Map<number, CrossRoad>();
        stubs = [];
        pool.empty();

        p.randomSeed(99);

        //scale(1,-1);
        //translate(0, -700);
        
        'use strict'; 
        
        console.log("entering mysetup");

        var last = null;
        

        const range = [...Array(gridSetting.gridSide).keys()].map(i => i * gridSetting.gridCaseSize + gridSetting.startOffset);

        
        var lines = [];
        for (var x of range) {
            var line = [];
            for (var y of range) {
                var ptId = pool.newPoint(x, y);
                var v = p5.Vector.random2D().mult(pushOver.length);
                let pt = pool.getPoint(ptId);
                pt.pos[0] += v.x;
                pt.pos[1] += v.y; 
                if (last != null) {
                    pool.newEdge(last, ptId);                  
                }
                last = ptId;
                line.push(last);  
            }
            last = null;
            lines.push(line);
        }
        
        for (const lidx of lines.keys()) {
            if (lidx == 0) {
                continue;
            }
            let previousLine = lines[lidx - 1];
            let currentLine = lines[lidx];
            for (const idx of currentLine.keys()) {
                let e  = previousLine[idx];
                var e2 = currentLine[idx];
                pool.newEdge(e, e2);
                
            }
        }
        
        
        for (let edge of pool.edgeArr) {      
            var w = p.random(roadSetting.min, roadSetting.max);
            roads.set(edge, new Road(edge, w));            
        }
        
        for (let ptId of Object.keys(pool.pointPool)) {
            let incomingRoads = [];
            let incomingEdges = pool.getIncomingEdge(Number(ptId));            
            for (let edge of incomingEdges){
                // if (!(roads.has(edgeId))){
                //     edgeId.reverse();
                    
                // }
                let r = roads.get(edge);        
                incomingRoads.push(r);
            }
            xroads.set(Number(ptId), new CrossRoad(Number(ptId), incomingRoads));
        }    
        
        stubs = [];
        for (let [id, xr] of xroads){
            xr.buildRoadStubs(stubs);
        }
    }

    p.draw = function() {
        'use strict';
        
        if (!ready) {
            ready = true;        
            p.mysetup();
            redraw = true;
        }
        
        if (redraw){
            p.clear();
            p.background(p.color("#212121")); // need to refresh, if not artifact from last frame.
            redraw = false;
            pool.render();      
            for (var [e,r] of roads){
                r.render();
            }
            
                    
            for (let ptId of Object.keys(pool.pointPool)){
                xroads.get(Number(ptId)).render();
            }
            
            
            for (let s of stubs){
                s.render();
            }            
        }    
    }
}

export function createSketch(){
    console.log(typeof p5);
    var myp5 = new p5(sketch);
}

createSketch();
