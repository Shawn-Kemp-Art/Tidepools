
document.body.innerHTML = '<style>div{color: grey;text-align:center;position:absolute;margin:auto;top:0;right:0;bottom:0;left:0;width:500px;height:100px;}</style><body><div id="loading"><p>This could take a while, please give it at least 5 minutes to render.</p><br><h1 class="spin">⏳</h1><br><h3>Press <strong>?</strong> for shortcut keys</h3><br><p><small>Output contains an embedded blueprint for creating an IRL wall sculpture</small></p></div></body>';

paper.install(window);
window.onload = function() {

document.body.innerHTML = '<style>body {margin: 0px;text-align: center;}</style><canvas resize="true" style="display:block;width:100%;" id="myCanvas"></canvas>';

setquery("fxhash",$fx.hash);
var initialTime = new Date().getTime();

//file name 
var fileName = $fx.hash;

var canvas = document.getElementById("myCanvas");

paper.setup('myCanvas');
paper.activate();

//vvvvvvvvvvvvvvv CLIPPER BOOLEAN ENGINE vvvvvvvvvvvvvvv
var CLIP_SCALE = 100;   // Integer precision for Clipper (100 = 0.01 unit resolution)
var CLIP_FLATTEN = 0.1; // Bezier-to-polygon tolerance (lower = smoother, more points)

function _toClipperPaths(paperItem) {
    var clone = paperItem.clone({ insert: false });
    clone.flatten(CLIP_FLATTEN);
    var children = (clone.className === 'CompoundPath') ? clone.children : [clone];
    var result = [];
    for (var i = 0; i < children.length; i++) {
        var segs = children[i].segments;
        if (segs.length < 3) continue;
        var pts = new Array(segs.length);
        for (var j = 0; j < segs.length; j++) {
            pts[j] = { X: Math.round(segs[j].point.x * CLIP_SCALE),
                       Y: Math.round(segs[j].point.y * CLIP_SCALE) };
        }
        result.push(pts);
    }
    clone.remove();
    return result;
}

function _fromClipperPaths(clipperPaths) {
    if (!clipperPaths || clipperPaths.length === 0) return new Path();
    var compound = new CompoundPath({});
    for (var i = 0; i < clipperPaths.length; i++) {
        var pts = clipperPaths[i];
        if (pts.length < 3) continue;
        var paperPts = new Array(pts.length);
        for (var j = 0; j < pts.length; j++) {
            paperPts[j] = new Point(pts[j].X / CLIP_SCALE, pts[j].Y / CLIP_SCALE);
        }
        compound.addChild(new Path({ segments: paperPts, closed: true, insert: false }));
    }
    // Use non-zero winding — matches Paper.js canvas default and Clipper's output orientation.
    // CleanPolygons removes near-degenerate edges that can cause winding flips at fine tolerances.
    ClipperLib.Clipper.CleanPolygons(clipperPaths, 0.5);
    compound.reorient(true, true);
    return compound;
}

function _clipBool(a, b, clipType) {
    var savedStyle = a.style;
    var clipper = new ClipperLib.Clipper();
    clipper.AddPaths(_toClipperPaths(a), ClipperLib.PolyType.ptSubject, true);
    clipper.AddPaths(_toClipperPaths(b), ClipperLib.PolyType.ptClip, true);
    var solution = new ClipperLib.Paths();
    clipper.Execute(clipType, solution,
        ClipperLib.PolyFillType.pftNonZero,
        ClipperLib.PolyFillType.pftNonZero);
    var result = _fromClipperPaths(solution);
    result.style = savedStyle;
    return result;
}

function clipUnite(a, b)     { return _clipBool(a, b, ClipperLib.ClipType.ctUnion); }
function clipSubtract(a, b)  { return _clipBool(a, b, ClipperLib.ClipType.ctDifference); }
function clipIntersect(a, b) { return _clipBool(a, b, ClipperLib.ClipType.ctIntersection); }
//^^^^^^^^^^^^^ END CLIPPER BOOLEAN ENGINE ^^^^^^^^^^^^^

console.log('hash: '+$fx.hash)
console.log('#'+$fx.iteration)

canvas.style.background = "white";

//Set a seed value for Perlin
var seed = Math.floor($fx.rand()*10000000000000000);

//initialize perlin noise 
var noise = new perlinNoise3d();
noise.noiseSeed(seed);

//read in query strings
var qcolor1 = "AllColors";
if(new URLSearchParams(window.location.search).get('c1')){qcolor1 = new URLSearchParams(window.location.search).get('c1')}; //colors1
var qcolor2 = "None";
if(new URLSearchParams(window.location.search).get('c2')){qcolor2 = new URLSearchParams(window.location.search).get('c2')}; //colors2
var qcolor3 = "None";
if(new URLSearchParams(window.location.search).get('c3')){qcolor3 = new URLSearchParams(window.location.search).get('c3')}; //colors3
var qcolors = R.random_int(1,6);
if(new URLSearchParams(window.location.search).get('c')){qcolors = new URLSearchParams(window.location.search).get('c')}; //number of colors
var qsize = "2";
if(new URLSearchParams(window.location.search).get('s')){qsize = new URLSearchParams(window.location.search).get('s')}; //size
var qlayers = 12;
if(new URLSearchParams(window.location.search).get('l')){qlayers = parseInt(new URLSearchParams(window.location.search).get('l'))}; //number of layers
var qwells = R.random_int(4,14);
if(new URLSearchParams(window.location.search).get('d')){qwells = parseInt(new URLSearchParams(window.location.search).get('d'))}; //number of wells (complexity)

var qaspect = "4:5";
if(new URLSearchParams(window.location.search).get('aspect')){qaspect = new URLSearchParams(window.location.search).get('aspect')}; //aspect ratio

var qpools = R.random_choice(["overlapping", "separate", "mixed"]);
if(new URLSearchParams(window.location.search).get('po')){qpools = new URLSearchParams(window.location.search).get('po')}; //pool layout: overlapping, separate, mixed
var qplacement = "random";
if(new URLSearchParams(window.location.search).get('pm')){qplacement = new URLSearchParams(window.location.search).get('pm')}; //well placement: random, phyllotaxis, poisson, voronoi
var qwellsize = R.random_int(12,22);
if(new URLSearchParams(window.location.search).get('ws')){qwellsize = parseInt(new URLSearchParams(window.location.search).get('ws'))}; //average well radius, % of the drawing area
var qaspectvar = R.random_int(0,10);
if(new URLSearchParams(window.location.search).get('av')){qaspectvar = parseInt(new URLSearchParams(window.location.search).get('av'))}; //0 = round wells, 10 = strongly elongated
var qskew = R.random_int(3,8);
if(new URLSearchParams(window.location.search).get('sk')){qskew = parseInt(new URLSearchParams(window.location.search).get('sk'))}; //0 = symmetric wells, 10 = lopsided with one steep side
var qblob = R.random_int(4,9);
if(new URLSearchParams(window.location.search).get('bl')){qblob = parseInt(new URLSearchParams(window.location.search).get('bl'))}; //0 = elliptical wells, 10 = strongly lobed pebble outlines
var qwarpfreq = R.random_int(2,6);
if(new URLSearchParams(window.location.search).get('wf')){qwarpfreq = parseInt(new URLSearchParams(window.location.search).get('wf'))}; //domain warp frequency
var qwarpamp = R.random_int(3,10);
if(new URLSearchParams(window.location.search).get('wa')){qwarpamp = parseInt(new URLSearchParams(window.location.search).get('wa'))}; //domain warp amplitude, % of the drawing area
var qsmink = R.random_int(6,20);
if(new URLSearchParams(window.location.search).get('k')){qsmink = parseInt(new URLSearchParams(window.location.search).get('k'))}; //smooth-min k x100: softness of shared walls
var qthickness = 1.5875; // 1/16 in
if(new URLSearchParams(window.location.search).get('th')){qthickness = parseFloat(new URLSearchParams(window.location.search).get('th'))}; //paper thickness, mm
var qminwall = 1.8;
if(new URLSearchParams(window.location.search).get('mw')){qminwall = parseFloat(new URLSearchParams(window.location.search).get('mw'))}; //minimum wall width, mm
var qminhole = 10;
if(new URLSearchParams(window.location.search).get('mh')){qminhole = parseFloat(new URLSearchParams(window.location.search).get('mh'))}; //minimum hole / island area, mm^2



var qorientation =R.random_int(1,2) < 2 ? "portrait" : "landscape";
var qframecolor = R.random_int(0,3) < 1 ? "White" : R.random_int(1,3) < 2 ? "Mocha" : "Random";     
var qmatwidth = R.random_int(50,100);


//fxparams
definitions = [
    {
        id: "layers",
        name: "Layers",
        type: "number",
        default: qlayers,
        options: {
            min: 6,
            max: 24,
            step: 1,
        },  
    },
    {
        id: "orientation",
        name: "Orientation",
        type: "select",
        default: qorientation,
        options: {options: ["portrait", "landscape"]},
    },
    {
        id: "aspectratio",
        name: "Aspect ratio",
        type: "select",
        default: qaspect,
        options: {options: ["1:1", "2:5","3:5","4:5","54:86","296:420"]},
    },
    {
        id: "size",
        name: "Size",
        type: "select",
        default: qsize,
        options: {options: ["1", "2", "3"]},
    },
    {
        id: "colors",
        name: "Max # of colors",
        type: "number",
        default: qcolors,
        options: {
            min: 1,
            max: 6,
            step: 1,
        },  
    },
    {
        id: "colors1",
        name: "Pallete 1",
        type: "select",
        default: qcolor1,
        options: {options: palleteNames},
    },
    {
        id: "colors2",
        name: "Pallete 2",
        type: "select",
        default: qcolor2,
        options: {options: palleteNames},
    },
    {
        id: "colors3",
        name: "Pallete 3",
        type: "select",
        default: qcolor3,
        options: {options: palleteNames},
    },
    {
        id: "framecolor",
        name: "Frame color",
        type: "select",
        default: qframecolor,
        options: {options: ["Random","White","Mocha"]},
    },
    {
        id: "wells",
        name: "Wells",
        type: "number",
        default: qwells,
        options: {min: 4, max: 14, step: 1},
    },
    {
        id: "pools",
        name: "Pool layout",
        type: "select",
        default: qpools,
        options: {options: ["overlapping", "separate", "mixed"]},
    },
    {
        id: "placement",
        name: "Well placement",
        type: "select",
        default: qplacement,
        options: {options: ["random", "phyllotaxis", "poisson", "voronoi"]},
    },
    {
        id: "wellsize",
        name: "Well size",
        type: "number",
        default: qwellsize,
        options: {min: 8, max: 30, step: 1},
    },
    {
        id: "aspectvar",
        name: "Well elongation",
        type: "number",
        default: qaspectvar,
        options: {min: 0, max: 10, step: 1},
    },
    {
        id: "skew",
        name: "Skew strength",
        type: "number",
        default: qskew,
        options: {min: 0, max: 10, step: 1},
    },
    {
        id: "blob",
        name: "Blobbiness",
        type: "number",
        default: qblob,
        options: {min: 0, max: 10, step: 1},
    },
    {
        id: "warpfreq",
        name: "Warp frequency",
        type: "number",
        default: qwarpfreq,
        options: {min: 1, max: 10, step: 1},
    },
    {
        id: "warpamp",
        name: "Warp amplitude",
        type: "number",
        default: qwarpamp,
        options: {min: 0, max: 15, step: 1},
    },
    {
        id: "smink",
        name: "Shared wall softness",
        type: "number",
        default: qsmink,
        options: {min: 2, max: 50, step: 1},
    },
    {
        id: "thickness",
        name: "Paper thickness (mm)",
        type: "number",
        default: qthickness,
        options: {min: 0.3, max: 3.2, step: 0.0025},
    },
    {
        id: "minwall",
        name: "Min wall width (mm)",
        type: "number",
        default: qminwall,
        options: {min: 0.5, max: 6, step: 0.1},
    },
    {
        id: "minhole",
        name: "Min hole area (mm²)",
        type: "number",
        default: qminhole,
        options: {min: 1, max: 100, step: 1},
    },
    {
        id: "matwidth",
        name: "Mat size",
        type: "number",
        default: qmatwidth,
        options: {
            min: 50,
            max: 150,
            step: 10,
        },  
    },
   
    ]


$fx.params(definitions)
var scale = $fx.getParam('size');
var stacks = $fx.getParam('layers');
var numofcolors = $fx.getParam('colors');


//Set the properties for the artwork where 100 = 1 inch
var wide = 800; 
var high = 1000; 

if ($fx.getParam('aspectratio')== "1:1"){wide = 800; high = 800};
if ($fx.getParam('aspectratio')== "2:5"){wide = 400; high = 1000};
if ($fx.getParam('aspectratio')== "3:5"){wide = 600; high = 1000};
if ($fx.getParam('aspectratio')== "4:5"){wide = 800; high = 1000};
if ($fx.getParam('aspectratio')== "54:86"){wide = 540; high = 860};
if ($fx.getParam('aspectratio')== "296:420"){wide =705; high = 1000};


var ratio = 1/scale;//use 1/4 for 32x40 - 1/3 for 24x30 - 1/2 for 16x20 - 1/1 for 8x10
var minOffset = ~~(7*ratio); //this is aproximatly .125"
var framewidth = ~~($fx.getParam('matwidth')*ratio*scale); 
var framradius = 0;


// Set a canvas size for when layers are exploded where 100=1in
var panelWide = 1600; 
var panelHigh = 2000; 
 
paper.view.viewSize.width = 2400;
paper.view.viewSize.height = 2400;


var colors = []; var palette = []; 

// set a pallete based on color schemes
var newPalette = [];
newPalette = this[$fx.getParam('colors1')].concat(this[$fx.getParam('colors2')],this[$fx.getParam('colors3')]);
for (c=0; c<numofcolors; c=c+1){palette[c] = newPalette[R.random_int(0, newPalette.length-1)]}  
console.log(newPalette);

//alternate colors
p=0;for (var c=0; c<stacks; c=c+1){colors[c] = palette[p];p=p+1;if(p==palette.length){p=0};}

console.log(colors);

if ($fx.getParam('framecolor')=="White"){colors[stacks-1]={"Hex":"#FFFFFF", "Name":"Smooth White"}};
if ($fx.getParam('framecolor')=="Mocha"){colors[stacks-1]={"Hex":"#4C4638", "Name":"Mocha"}};


var woodframe = new Path();var framegap = new Path();
var fColor = frameColors[R.random_int(0, frameColors.length-1)];
fColor = {"Hex":"#60513D","Name":"Walnut"};
var frameColor = fColor.Hex;

//adjust the canvas dimensions
w=wide;h=high;
var orientation="Portrait";
 
if ($fx.getParam('orientation')=="landscape"){wide = h;high = w;orientation="Landscape";};
if ($fx.getParam('orientation')=="portrait"){wide = w;high = h;orientation="Portrait";};

//setup the project variables


//Set the line color
linecolor={"Hex":"#4C4638", "Name":"Mocha"};


//************* Draw the layers ************* 


sheet = []; //This will hold each layer

var px=0;var py=0;var pz=0;var prange=.1; 


//************* Basin relief: height field -> contour levels (deterministic via $fx.rand) *************

var drawareawide = wide-framewidth*2;
var drawareahigh = high-framewidth*2;
var minDim = Math.min(drawareawide, drawareahigh);

var bbox = {
    minX: framewidth,
    minY: framewidth,
    maxX: wide - framewidth,
    maxY: high - framewidth
};

// 100 units = 1 inch at size 1; the size param scales the physical piece up.
var unitsPerMM = 100*ratio/25.4;
var paperThickness = $fx.getParam('thickness');
var minWallUnits = $fx.getParam('minwall')*unitsPerMM;
var minHoleUnits2 = $fx.getParam('minhole')*unitsPerMM*unitsPerMM;

var GRID_STEP = 3;                // height field sample spacing, units
var MAX_ATTEMPTS = 8;             // bounded regeneration when a seed breaks fabrication limits
var MAX_CLEANUP_FRACTION = 0.03;  // reject when cleanup has to rewrite more than this share of the cut area
var TOP_RIM = 0.15;               // top layer's contour, as a fraction of full depth; shallower levels trace faint well tails

// Domain warp reuses the seeded Perlin generator; 2 octaves keeps it low-frequency.
noise.perlin_octaves = 2;
var WARP_NOISE_RANGE = 0.75; // sum of octave amplitudes (0.5 + 0.25)
var warpScale = $fx.getParam('warpfreq')/(minDim*6);
var warpAmp = minDim*$fx.getParam('warpamp')/100;
var sminK = $fx.getParam('smink')/100;

// Sutherland-Hodgman clip of polygon by a half-plane (keeps the side where the site lies).
function clipHalfPlane(poly, mx, my, dx, dy) {
    var out = [];
    var n = poly.length;
    if (n < 3) return out;
    for (var i = 0; i < n; i++) {
        var s = poly[i];
        var e = poly[(i + 1) % n];
        var sd = (s.x - mx) * dx + (s.y - my) * dy;
        var ed = (e.x - mx) * dx + (e.y - my) * dy;
        if (sd <= 0) {
            if (ed <= 0) {
                out.push(e);
            } else {
                var t = sd / (sd - ed);
                out.push({x: s.x + (e.x - s.x) * t, y: s.y + (e.y - s.y) * t});
            }
        } else if (ed <= 0) {
            var t = sd / (sd - ed);
            out.push({x: s.x + (e.x - s.x) * t, y: s.y + (e.y - s.y) * t});
            out.push(e);
        }
    }
    return out;
}

function computeVoronoiCell(idx, siteList) {
    var cell = [
        {x: bbox.minX, y: bbox.minY},
        {x: bbox.maxX, y: bbox.minY},
        {x: bbox.maxX, y: bbox.maxY},
        {x: bbox.minX, y: bbox.maxY}
    ];
    var s = siteList[idx];
    for (var i = 0; i < siteList.length; i++) {
        if (i === idx) continue;
        var p = siteList[i];
        var dx = p.x - s.x;
        var dy = p.y - s.y;
        if (dx*dx + dy*dy < 1e-9) continue;
        cell = clipHalfPlane(cell, (s.x + p.x) * 0.5, (s.y + p.y) * 0.5, dx, dy);
        if (cell.length < 3) return null;
    }
    return cell;
}

function polygonCentroid(poly) {
    var cx = 0, cy = 0, area = 0;
    for (var j = 0; j < poly.length; j++) {
        var p = poly[j], q = poly[(j+1)%poly.length];
        var cross = p.x*q.y - q.x*p.y;
        area += cross;
        cx += (p.x + q.x) * cross;
        cy += (p.y + q.y) * cross;
    }
    area *= 0.5;
    if (Math.abs(area) < 1e-6) return null;
    return {x: cx / (6 * area), y: cy / (6 * area)};
}

function placeWellCenters(count, mode) {
    var pad = minDim*0.12;
    var randomPoint = function() {
        return {x: bbox.minX + pad + R.random_dec()*(drawareawide - 2*pad),
                y: bbox.minY + pad + R.random_dec()*(drawareahigh - 2*pad)};
    };
    var centers = [];
    if (mode == "phyllotaxis") {
        // Golden-angle spiral, stretched to the drawing area's proportions.
        var golden = Math.PI*(3 - Math.sqrt(5));
        var spin = R.random_dec()*Math.PI*2;
        var cx = bbox.minX + drawareawide/2, cy = bbox.minY + drawareahigh/2;
        var rx = drawareawide/2 - pad, ry = drawareahigh/2 - pad;
        for (var i = 0; i < count; i++) {
            var r = Math.sqrt((i + 0.5)/count);
            var theta = i*golden + spin;
            centers.push({x: cx + r*rx*Math.cos(theta), y: cy + r*ry*Math.sin(theta)});
        }
    } else if (mode == "poisson") {
        // Dart throwing with a shrinking radius so dense counts still fill.
        var minDist = 0.7*Math.sqrt(drawareawide*drawareahigh/count);
        var tries = 0;
        while (centers.length < count) {
            var p = randomPoint();
            var ok = true;
            for (var c = 0; c < centers.length; c++) {
                if (Math.hypot(centers[c].x - p.x, centers[c].y - p.y) < minDist) { ok = false; break; }
            }
            if (ok) centers.push(p);
            if (++tries % 200 == 0) minDist *= 0.9;
        }
    } else if (mode == "voronoi") {
        // Lloyd-relaxed random sites: even Voronoi spacing.
        for (var i = 0; i < count; i++) centers.push(randomPoint());
        for (var iter = 0; iter < 6; iter++) {
            var relaxed = [];
            for (var i = 0; i < centers.length; i++) {
                var vc = computeVoronoiCell(i, centers);
                var cc = vc ? polygonCentroid(vc) : null;
                relaxed.push(cc || centers[i]);
            }
            centers = relaxed;
        }
    } else {
        for (var i = 0; i < count; i++) centers.push(randomPoint());
    }
    return centers;
}

// Low-order harmonics on a well's outline (k = 2..5) turn an ellipse into a pebble.
// Amplitudes fall off with k and are capped so the radius never folds back on itself.
var LOBE_AMPS = [0.16, 0.13, 0.09, 0.06];

function makeLobes(blob) {
    var lobes = [];
    for (var k = 0; k < LOBE_AMPS.length; k++) {
        lobes.push({k: k + 2, a: blob*LOBE_AMPS[k]*(0.4 + R.random_dec()*0.6), p: R.random_dec()*Math.PI*2});
    }
    return lobes;
}

function makeWells() {
    var centers = placeWellCenters($fx.getParam('wells'), $fx.getParam('placement'));
    var sigmaBase = minDim*$fx.getParam('wellsize')/100;
    var aspectVar = $fx.getParam('aspectvar')/10;
    var skew = $fx.getParam('skew')/10;
    var blob = $fx.getParam('blob')/10;
    var wells = [];
    for (var i = 0; i < centers.length; i++) {
        var sx = sigmaBase*(0.75 + R.random_dec()*0.5);
        wells.push({
            cx: centers[i].x, cy: centers[i].y,
            sx: sx,
            sy: sx*(1 - aspectVar*R.random_dec()*0.7),
            rot: R.random_dec()*Math.PI,
            depth: 0.55 + R.random_dec()*0.45,
            skewAngle: R.random_dec()*Math.PI*2,
            skewStrength: skew*(0.6 + R.random_dec()*0.4),
            lobes: makeLobes(blob)
        });
    }
    return wells;
}

// Anisotropic Gaussian well, skewed: the low point shifts toward skewAngle and the
// opposite side's radius is compressed, so contours bunch up on that steep side.
function wellValue(wx, wy, well) {
    var dx = wx - well.cx, dy = wy - well.cy;
    var c = Math.cos(-well.rot), s = Math.sin(-well.rot);
    var nx = (dx*c - dy*s)/well.sx, ny = (dx*s + dy*c)/well.sy;
    var ux = nx - well.skewStrength*0.5*Math.cos(well.skewAngle);
    var uy = ny - well.skewStrength*0.5*Math.sin(well.skewAngle);
    var phi = Math.atan2(uy, ux);
    var compression = 1 + well.skewStrength*Math.cos(phi - well.skewAngle);
    compression = Math.min(2.0, Math.max(0.5, compression));
    var lobe = 1;
    for (var k = 0; k < well.lobes.length; k++) {
        var L = well.lobes[k];
        lobe += L.a*Math.cos(L.k*phi + L.p);
    }
    var ue = Math.hypot(ux, uy)*compression/Math.max(0.5, lobe);
    return -well.depth*Math.exp(-0.5*ue*ue);
}

function smin(a, b, k) {
    var h = Math.max(k - Math.abs(a - b), 0)/k;
    return Math.min(a, b) - h*h*k*0.25;
}

// Forces the field back to the flat rim near the frame so every contour closes inside the sheet.
function edgeTaper(x, y) {
    var d = Math.min(x - bbox.minX, bbox.maxX - x, y - bbox.minY, bbox.maxY - y);
    var t = d/(minDim*0.08);
    if (t >= 1) return 1;
    if (t <= 0) return 0;
    return t*t*(3 - 2*t);
}

var deepestWell = -1; // index of the well dominating the last heightAt() sample

function heightAt(x, y, wells, attempt) {
    var wx = x, wy = y;
    if (warpAmp > 0) {
        var nz = attempt*7.3;
        wx += (noise.get(x*warpScale, y*warpScale, nz)/WARP_NOISE_RANGE - 0.5)*2*warpAmp;
        wy += (noise.get(x*warpScale + 37.2, y*warpScale + 91.7, nz)/WARP_NOISE_RANGE - 0.5)*2*warpAmp;
    }
    // Blend only the two deepest wells, faded in with depth: Gaussians asymptote to 0,
    // so chaining smin across every well would sink the whole flat rim, and a hard
    // on/off gate leaves a step that shallow contours zigzag along.
    var min1 = 0, min2 = 0;
    deepestWell = -1;
    for (var i = 0; i < wells.length; i++) {
        var v = wellValue(wx, wy, wells[i]);
        if (v < min1) { min2 = min1; min1 = v; deepestWell = i; }
        else if (v < min2) { min2 = v; }
    }
    var fade = Math.min(1, Math.max(0, (-min1 - 0.01)/0.1));
    fade = fade*fade*(3 - 2*fade);
    var h = min1 + fade*(smin(min1, min2, sminK) - min1);
    return Math.min(h, 0)*edgeTaper(x, y);
}

function buildField(wells, attempt, step) {
    step = step || GRID_STEP;
    var cols = Math.floor(drawareawide/step) + 1;
    var rows = Math.floor(drawareahigh/step) + 1;
    var stepX = drawareawide/(cols - 1), stepY = drawareahigh/(rows - 1);
    var grid = new Float64Array(cols*rows);
    var owner = new Int16Array(cols*rows);
    var hmin = 0;
    for (var j = 0; j < rows; j++) {
        for (var i = 0; i < cols; i++) {
            var v = heightAt(bbox.minX + i*stepX, bbox.minY + j*stepY, wells, attempt);
            grid[j*cols + i] = v;
            owner[j*cols + i] = deepestWell;
            if (v < hmin) hmin = v;
        }
    }
    return {cols: cols, rows: rows, stepX: stepX, stepY: stepY, grid: grid, owner: owner, hmin: hmin};
}

// Pool layout. "overlapping" leaves wells free to merge. "separate" makes every well its
// own pool; "mixed" groups wells into a few clusters that may overlap internally.
// Non-overlapping layouts are composed around a focal point: pools are sized largest near
// it, packed toward it by a small physics pass, then fitted on the real field so pools of
// different clusters sit POOL_GAP apart and clear of the frame margin.
var POOL_GAP = Math.max(minWallUnits*3, minDim*0.04);
var POOL_STEP = 5;
var POOL_SHRINK = 0.92;
var POOL_GROW = 1.05;
var POOL_MAX_GROWTH = 1.4;  // a pool may grow this far past its composed size to take up slack
var POOL_REACH = 1.5;       // rough top-contour radius of a well, in sigmas, used for packing
var MIN_WELL_SIGMA = minDim*0.03;

function assignClusters(wells, style) {
    if (style == "separate") {
        for (var i = 0; i < wells.length; i++) wells[i].cluster = i;
        return;
    }
    // mixed: farthest-point seeds, each well joins its nearest seed
    var k = Math.max(2, Math.round(wells.length/3));
    var seeds = [0];
    while (seeds.length < Math.min(k, wells.length)) {
        var best = -1, bestD = -1;
        for (var i = 0; i < wells.length; i++) {
            var d = Infinity;
            for (var s = 0; s < seeds.length; s++) {
                d = Math.min(d, Math.hypot(wells[i].cx - wells[seeds[s]].cx, wells[i].cy - wells[seeds[s]].cy));
            }
            if (d > bestD) { bestD = d; best = i; }
        }
        seeds.push(best);
    }
    for (var i = 0; i < wells.length; i++) {
        var nearest = 0, nd = Infinity;
        for (var s = 0; s < seeds.length; s++) {
            var d = Math.hypot(wells[i].cx - wells[seeds[s]].cx, wells[i].cy - wells[seeds[s]].cy);
            if (d < nd) { nd = d; nearest = s; }
        }
        wells[i].cluster = nearest;
    }
}

// Compose pools around a random focal point: sizes taper from large to small, the largest
// sits on the focus and the rest follow a golden-angle spiral outward. A packing pass then
// pulls each well in and pushes apart pools of different clusters until their estimated
// outlines are POOL_GAP apart. Wells of the same mixed cluster may overlap and are held together.
function composePools(wells) {
    var edgeBand = minDim*0.08;
    var focus = {x: bbox.minX + drawareawide*(0.35 + R.random_dec()*0.3),
                 y: bbox.minY + drawareahigh*(0.35 + R.random_dec()*0.3)};
    var sheetCx = bbox.minX + drawareawide/2, sheetCy = bbox.minY + drawareahigh/2;
    var sumF2 = 0;
    for (var r = 0; r < wells.length; r++) {
        var t = wells.length > 1 ? r/(wells.length - 1) : 0;
        wells[r].sizeFactor = (1 - 0.6*t)*(0.85 + R.random_dec()*0.3);
        sumF2 += wells[r].sizeFactor*wells[r].sizeFactor;
    }
    var coverage = Math.min(0.6, Math.max(0.3, $fx.getParam('wellsize')/35));
    if ($fx.getParam('pools') == "mixed") coverage *= 1.4; // wells in a cluster overlap, so they cover less than their sum
    var base = Math.sqrt(coverage*drawareawide*drawareahigh/(Math.PI*POOL_REACH*POOL_REACH*sumF2));
    for (var i = 0; i < wells.length; i++) {
        var w = wells[i];
        var scale = base*w.sizeFactor/((w.sx + w.sy)/2);
        w.sx *= scale;
        w.sy *= scale;
        w.maxSigma = Math.max(w.sx, w.sy)*POOL_MAX_GROWTH;
    }
    // Largest first on the focus, then outward along a golden-angle spiral (packing
    // settles the exact spacing); mixed clusters stay contiguous along the spiral.
    wells.sort(function(a, b) { return a.cluster - b.cluster || b.sizeFactor - a.sizeFactor; });
    var golden = Math.PI*(3 - Math.sqrt(5));
    var spin = R.random_dec()*Math.PI*2;
    var spacing = base*POOL_REACH*1.2;
    for (var i = 0; i < wells.length; i++) {
        var rad = spacing*Math.sqrt(i)*(0.9 + R.random_dec()*0.2);
        wells[i].cx = focus.x + rad*Math.cos(i*golden + spin);
        wells[i].cy = focus.y + rad*Math.sin(i*golden + spin);
    }

    for (var it = 0; it < 400; it++) {
        for (var i = 0; i < wells.length; i++) {
            wells[i].cx += (focus.x - wells[i].cx)*0.03;
            wells[i].cy += (focus.y - wells[i].cy)*0.03;
        }
        for (var a = 0; a < wells.length; a++) {
            for (var b = a + 1; b < wells.length; b++) {
                var A = wells[a], B = wells[b];
                var ra = POOL_REACH*(A.sx + A.sy)/2, rb = POOL_REACH*(B.sx + B.sy)/2;
                var same = A.cluster === B.cluster;
                var need = same ? 0.5*(ra + rb) : ra + rb + POOL_GAP;
                var dx = B.cx - A.cx, dy = B.cy - A.cy;
                var d = Math.hypot(dx, dy);
                if (d < 1e-6) { dx = 1; dy = 0; d = 1e-6; }
                if (d < need) {
                    var push = (need - d)/2;
                    A.cx -= dx/d*push; A.cy -= dy/d*push;
                    B.cx += dx/d*push; B.cy += dy/d*push;
                } else if (same && d > 0.8*(ra + rb)) {
                    var pull = (d - 0.8*(ra + rb))*0.05;
                    A.cx += dx/d*pull; A.cy += dy/d*pull;
                    B.cx -= dx/d*pull; B.cy -= dy/d*pull;
                }
            }
        }
        for (var i = 0; i < wells.length; i++) {
            var w = wells[i];
            var rw = POOL_REACH*(w.sx + w.sy)/2 + edgeBand;
            w.cx = rw*2 < drawareawide ? Math.min(bbox.maxX - rw, Math.max(bbox.minX + rw, w.cx)) : sheetCx;
            w.cy = rw*2 < drawareahigh ? Math.min(bbox.maxY - rw, Math.max(bbox.minY + rw, w.cy)) : sheetCy;
        }
    }
    return focus;
}

// Wells whose top-layer pool comes within POOL_GAP of another cluster's pool, or reaches
// the frame margin. Pools are grown by half the gap on the grid; any grown component
// holding more than one cluster (or touching the margin) flags every well in it.
function poolConflicts(f, wells, T, edgeBand) {
    var cols = f.cols, rows = f.rows, n = cols*rows;
    var inPool = new Uint8Array(n);
    for (var k = 0; k < n; k++) inPool[k] = f.grid[k] < T && f.owner[k] >= 0 ? 1 : 0;
    var grown = inPool.slice();
    var r = Math.ceil(POOL_GAP/2/Math.min(f.stepX, f.stepY));
    for (var pass = 0; pass < r; pass++) {
        var prev = grown.slice();
        for (var j = 0; j < rows; j++) {
            for (var i = 0; i < cols; i++) {
                var k = j*cols + i;
                if (prev[k]) continue;
                if ((i > 0 && prev[k - 1]) || (i < cols - 1 && prev[k + 1]) ||
                    (j > 0 && prev[k - cols]) || (j < rows - 1 && prev[k + cols])) grown[k] = 1;
            }
        }
    }
    var comp = new Int32Array(n).fill(-1);
    var bad = {};
    var stack = [];
    for (var start = 0; start < n; start++) {
        if (!grown[start] || comp[start] >= 0) continue;
        var members = {}, clusters = {}, clusterCount = 0, edge = false;
        comp[start] = start;
        stack.push(start);
        while (stack.length) {
            var c = stack.pop();
            var ci = c % cols, cj = (c - ci)/cols;
            if (inPool[c]) {
                var w = f.owner[c];
                members[w] = true;
                if (!clusters[wells[w].cluster]) { clusters[wells[w].cluster] = true; clusterCount++; }
                var ex = ci*f.stepX, ey = cj*f.stepY;
                if (ex < edgeBand || ey < edgeBand || drawareawide - ex < edgeBand || drawareahigh - ey < edgeBand) edge = true;
            }
            var nbs = [ci > 0 ? c - 1 : -1, ci < cols - 1 ? c + 1 : -1, cj > 0 ? c - cols : -1, cj < rows - 1 ? c + cols : -1];
            for (var q = 0; q < 4; q++) {
                var nb = nbs[q];
                if (nb >= 0 && grown[nb] && comp[nb] < 0) { comp[nb] = start; stack.push(nb); }
            }
        }
        if (clusterCount > 1 || edge) for (var w in members) bad[w] = true;
    }
    return bad;
}

// Grow each unsettled well (up to its maxSigma) until its top-layer pool comes within the
// gap of another cluster's pool or the frame margin; shrink any that conflict. Returns the
// wells that survive.
function fitPools(wells, attempt) {
    var style = $fx.getParam('pools');
    var edgeBand = minDim*0.08;
    for (var iter = 0; iter < 80; iter++) {
        var forceSettle = iter >= 60; // last passes only shrink, so the loop always ends clean
        var f = buildField(wells, attempt, POOL_STEP);
        var T = f.hmin*TOP_RIM;
        var bad = poolConflicts(f, wells, T, edgeBand), badCount = Object.keys(bad).length;
        var growing = false;
        var kept = [];
        for (var i = 0; i < wells.length; i++) {
            var w = wells[i];
            if (bad[i]) {
                w.sx *= POOL_SHRINK;
                w.sy *= POOL_SHRINK;
                w.settled = true;
                if (Math.max(w.sx, w.sy) < MIN_WELL_SIGMA) continue;
            } else if (!w.settled && !forceSettle) {
                w.sx *= POOL_GROW;
                w.sy *= POOL_GROW;
                if (Math.max(w.sx, w.sy) > w.maxSigma) w.settled = true;
                growing = true;
            }
            kept.push(w);
        }
        if (kept.length < wells.length && !forceSettle) {
            // A dropped well frees room: let the survivors grow into it.
            for (var i = 0; i < kept.length; i++) kept[i].settled = false;
            growing = true;
        }
        if (!badCount && !growing) {
            return kept;
        }
        wells = kept;
    }
    console.log('[basins] ' + style + ' pools: some pools still outside their territory after 80 steps');
    return wells;
}

function separatePools(wells, attempt) {
    var style = $fx.getParam('pools');
    if (style == "overlapping") return wells;
    assignClusters(wells, style);
    var focus = composePools(wells);
    for (var i = 0; i < wells.length; i++) wells[i].settled = false;
    wells = fitPools(wells, attempt);
    console.log('[basins] ' + style + ' pools around focal point (' + Math.round(focus.x) + ',' + Math.round(focus.y) + '): ' + wells.length + ' wells kept');
    return wells;
}

// Marching squares -> closed rings in Clipper integer space. Crossings are keyed by grid
// edge id so neighbouring cells share exact endpoints and every ring closes.
function contourRings(field, T) {
    var cols = field.cols, rows = field.rows, g = field.grid;
    var edgePts = new Map();
    function edgePoint(id) {
        var p = edgePts.get(id);
        if (p) return p;
        var node = id >> 1;
        var i = node % cols, j = (node - i)/cols;
        var a = g[node], b, x, y;
        if (id & 1) { // vertical edge (i,j)-(i,j+1)
            b = g[node + cols];
            x = bbox.minX + i*field.stepX;
            y = bbox.minY + (j + (T - a)/(b - a))*field.stepY;
        } else {      // horizontal edge (i,j)-(i+1,j)
            b = g[node + 1];
            x = bbox.minX + (i + (T - a)/(b - a))*field.stepX;
            y = bbox.minY + j*field.stepY;
        }
        p = {X: Math.round(x*CLIP_SCALE), Y: Math.round(y*CLIP_SCALE)};
        edgePts.set(id, p);
        return p;
    }
    var segs = [];
    var edgeSegs = new Map();
    function addSeg(e1, e2) {
        var k = segs.length;
        segs.push([e1, e2]);
        (edgeSegs.get(e1) || edgeSegs.set(e1, []).get(e1)).push(k);
        (edgeSegs.get(e2) || edgeSegs.set(e2, []).get(e2)).push(k);
    }
    for (var j = 0; j < rows - 1; j++) {
        for (var i = 0; i < cols - 1; i++) {
            var n = j*cols + i;
            var tl = g[n], tr = g[n + 1], bl = g[n + cols], br = g[n + cols + 1];
            var code = (bl < T ? 1 : 0) | (br < T ? 2 : 0) | (tr < T ? 4 : 0) | (tl < T ? 8 : 0);
            if (code === 0 || code === 15) continue;
            var eT = n*2, eB = (n + cols)*2, eL = n*2 + 1, eR = (n + 1)*2 + 1;
            var centerIn = (tl + tr + bl + br)/4 < T;
            switch (code) {
                case 1: case 14: addSeg(eL, eB); break;
                case 2: case 13: addSeg(eB, eR); break;
                case 3: case 12: addSeg(eL, eR); break;
                case 4: case 11: addSeg(eR, eT); break;
                case 6: case 9:  addSeg(eB, eT); break;
                case 7: case 8:  addSeg(eL, eT); break;
                case 5:  // bl + tr inside
                    if (centerIn) { addSeg(eL, eT); addSeg(eB, eR); } else { addSeg(eL, eB); addSeg(eR, eT); }
                    break;
                case 10: // br + tl inside
                    if (centerIn) { addSeg(eL, eB); addSeg(eR, eT); } else { addSeg(eL, eT); addSeg(eB, eR); }
                    break;
            }
        }
    }
    var used = new Uint8Array(segs.length);
    var rings = [];
    for (var s = 0; s < segs.length; s++) {
        if (used[s]) continue;
        var ring = [];
        var startEdge = segs[s][0], edge = segs[s][1], cur = s;
        used[cur] = 1;
        ring.push(edgePoint(startEdge));
        while (edge !== startEdge) {
            ring.push(edgePoint(edge));
            var pair = edgeSegs.get(edge);
            var next = pair[0] === cur ? pair[1] : pair[0];
            if (next === undefined || used[next]) break;
            used[next] = 1;
            edge = segs[next][0] === edge ? segs[next][1] : segs[next][0];
            cur = next;
        }
        if (ring.length >= 3) rings.push(ring);
    }
    return rings;
}

function clipperUnion(paths, fillType) {
    var c = new ClipperLib.Clipper();
    c.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
    var sol = new ClipperLib.Paths();
    c.Execute(ClipperLib.ClipType.ctUnion, sol, fillType, fillType);
    return sol;
}

function clipperOffset(paths, delta) {
    var co = new ClipperLib.ClipperOffset(2, 0.25*CLIP_SCALE);
    co.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
    var sol = new ClipperLib.Paths();
    co.Execute(sol, delta*CLIP_SCALE);
    return sol;
}

function netArea(paths) {
    var a = 0;
    for (var i = 0; i < paths.length; i++) a += ClipperLib.Clipper.Area(paths[i]);
    return a/(CLIP_SCALE*CLIP_SCALE);
}

// Region of the sheet below height T (what gets cut), cleaned for the laser:
// opening drops cut slivers narrower than the min wall, closing fills material walls
// thinner than it, holes under the min area are dropped, and every island is cut away
// so the sheet stays one connected piece (an island is material the cut fully encloses).
function levelRegion(field, T) {
    var raw = clipperUnion(contourRings(field, T), ClipperLib.PolyFillType.pftEvenOdd);
    var half = minWallUnits/2;
    var opened = clipperOffset(clipperOffset(raw, -half), half);
    var closed = clipperOffset(clipperOffset(opened, half), -half);
    var kept = [];
    var report = {rawArea: netArea(raw), holes: 0, islands: 0, droppedArea: 0, islandArea: 0};
    for (var i = 0; i < closed.length; i++) {
        var a = ClipperLib.Clipper.Area(closed[i])/(CLIP_SCALE*CLIP_SCALE);
        if (a < 0) {
            report.islands++;
            report.islandArea -= a;
        } else if (a < minHoleUnits2) {
            report.holes++;
            report.droppedArea += a;
        } else {
            kept.push(closed[i]);
        }
    }
    report.sliverArea = Math.max(0, report.rawArea - netArea(opened));
    report.wallArea = Math.max(0, netArea(closed) - netArea(opened));
    return {paths: clipperUnion(kept, ClipperLib.PolyFillType.pftPositive), report: report};
}

// Tightest in-plan ledge between consecutive layers, from the field's steepest slope.
function tightestLedgeMM(field) {
    var mmPerUnit = 1/unitsPerMM;
    var mmPerHeight = (stacks - 1)*paperThickness/(-field.hmin*(1 - TOP_RIM));
    var worst = Infinity;
    var g = field.grid, cols = field.cols;
    for (var j = 1; j < field.rows - 1; j++) {
        for (var i = 1; i < cols - 1; i++) {
            var n = j*cols + i;
            if (g[n] > -1e-4) continue;
            var gx = (g[n + 1] - g[n - 1])/(2*field.stepX);
            var gy = (g[n + cols] - g[n - cols])/(2*field.stepY);
            var slope = Math.hypot(gx, gy)*mmPerHeight/mmPerUnit;
            if (slope > 1e-9) worst = Math.min(worst, paperThickness/slope);
        }
    }
    return worst;
}

// Level z (1..stacks-1) cuts everything below its threshold; layer 0 stays a solid back panel.
// Thresholds are evenly spaced from the deepest point up to TOP_RIM of full depth.
function levelThreshold(hmin, z) {
    return hmin*(1 - (z/(stacks - 1))*(1 - TOP_RIM));
}

function buildLevels(field) {
    var levels = [null];
    for (var z = 1; z < stacks; z++) {
        levels.push(levelRegion(field, levelThreshold(field.hmin, z)));
    }
    return levels;
}

function mm2(unitsSq) { return (unitsSq/(unitsPerMM*unitsPerMM)).toFixed(1); }

var basin = null;
for (var attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    var wells = separatePools(makeWells(), attempt);
    var field = buildField(wells, attempt);
    var levels = buildLevels(field);

    var totalCut = 0, totalAltered = 0, problems = [];
    for (var z = 1; z < stacks; z++) {
        var r = levels[z].report;
        totalCut += r.rawArea;
        totalAltered += r.sliverArea + r.wallArea + r.droppedArea;
        var bits = [];
        if (r.wallArea > 1) bits.push('thin walls filled ' + mm2(r.wallArea) + 'mm²');
        if (r.sliverArea > 1) bits.push('slivers removed ' + mm2(r.sliverArea) + 'mm²');
        if (r.holes) bits.push(r.holes + ' hole(s) under min area');
        if (r.islands) bits.push(r.islands + ' floating island(s) cut away, ' + mm2(r.islandArea) + 'mm²');
        if (bits.length) problems.push('layer ' + z + ': ' + bits.join(', '));
    }
    var alteredFraction = totalCut > 0 ? totalAltered/totalCut : 1;
    var candidate = {wells: wells, field: field, levels: levels, attempt: attempt + 1, alteredFraction: alteredFraction};
    if (!basin || alteredFraction < basin.alteredFraction) basin = candidate;

    if (totalCut <= 0) {
        console.log('[basins] attempt ' + (attempt + 1) + ' rejected: no basin reaches the top layer');
        continue;
    }
    if (alteredFraction <= MAX_CLEANUP_FRACTION) {
        console.log('[basins] attempt ' + (attempt + 1) + ' accepted: cleanup altered ' + (alteredFraction*100).toFixed(1) + '% of cut area' + (problems.length ? ' (' + problems.join('; ') + ')' : ''));
        basin = candidate;
        break;
    }
    console.log('[basins] attempt ' + (attempt + 1) + ' rejected: cleanup altered ' + (alteredFraction*100).toFixed(1) + '% of cut area, limit ' + (MAX_CLEANUP_FRACTION*100) + '% (' + problems.join('; ') + ')');
    if (attempt == MAX_ATTEMPTS - 1) {
        console.log('[basins] no attempt within limits; using attempt ' + basin.attempt + ' (' + (basin.alteredFraction*100).toFixed(1) + '% altered), cleaned geometry still meets wall/area minimums');
    }
}
console.log('[basins] ' + basin.wells.length + ' wells, ' + $fx.getParam('placement') + ' placement, tightest ledge ' + tightestLedgeMM(basin.field).toFixed(2) + 'mm');



var features = {};
var renderTime;

paper.view.autoUpdate = false;

(async () => {

//---- Draw the Layers

// Clipper cold-start guard: the very first boolean op silently returns empty
// if it runs before paper.js has yielded once. Force one update + a macrotask
// so the first real op below isn't the cold one (would drop the bottom layer).
paper.view.update();
await new Promise(resolve => setTimeout(resolve, 0));

for (z = 0; z < stacks; z++) {
    pz=z*prange;
    
    drawFrame(z); // Draw the initial frame
    solid(z);

         //-----Draw each layer
        if(z<stacks-1 && z!=0 ){
            if (z==stacks-2){oset = minOffset}else{oset = ~~(minOffset*(stacks-z-1))}
            var li = R.random_int(12, 12);
            for (l=0;l<li;l++){
                //somelines(z); 
            }
            

        }


        
    if (z > 0 && basin.levels[z].paths.length) {
        cut(z, _fromClipperPaths(basin.levels[z].paths));
    }

    frameIt(z);// finish the layer with a final frame cleanup 

    cutMarks(z);
    hanger(z);// add hanger holes
    if (z == stacks-1) {signature(z);}// sign the top layer
    sheet[z].scale(2.2);
    sheet[z].position = new Point(paper.view.viewSize.width/2, paper.view.viewSize.height/2);
   
    var group = new Group(sheet[z]);
    
    console.log(z)//Show layer completed in console

    paper.view.update();
    await new Promise(resolve => setTimeout(resolve, 0));

}//end z loop

//--------- Finish up the preview ----------------------- 

    // Build the features and trigger an fxhash preview
    features = {};
    features.Size =  ~~(wide/100/ratio)+" x "+~~(high/100/ratio)+" inches";
    features.Width = ~~(wide/100/ratio);
    features.Height = ~~(high/100/ratio);
    features.Depth = Math.round(stacks*paperThickness/25.4*10000)/10000;
    features.Layers = stacks;
    features.Wells = basin.wells.length;
    features.Placement = $fx.getParam('placement');
    features.Pools = $fx.getParam('pools');
    for (l=stacks;l>0;l--){
    var key = "layer: "+(stacks-l+1)
    features[key] = colors[l-1].Name
    }
    console.log(features);
    $fx.features(features);
    //$fx.preview();

//Begin send to studio.shawnkemp.art **************************************************************
     // Only set the API base if the renderer hasn't injected one — otherwise we
     // clobber __STUDIO_API_BASE__ and push artifacts to the wrong environment.
     if (!window.__STUDIO_API_BASE__) {
         studioAPI.setApiBase('https://studio-shawnkemp-art.vercel.app');
     }
     if(new URLSearchParams(window.location.search).get('skart')){sendAllExports()};
//End send to studio.shawnkemp.art **************************************************************

      var finalTime = new Date().getTime();
    renderTime = (finalTime - initialTime)/1000
    console.log ('Render took : ' +  renderTime.toFixed(2) + ' seconds' );

    paper.view.autoUpdate = true;
    paper.view.update();

})();

async function sendAllExports() {

        paper.view.update();
        // Send canvas as PNG
        await studioAPI.sendCanvas(myCanvas, $fx.hash, $fx.hash+".png");

        // Send SVG
        await studioAPI.sendSVG(project.exportSVG({asString: true}), $fx.hash, $fx.hash+".svg");

        // send colors
        var content = JSON.stringify(features,null,2);

        // Send text/JSON
        await studioAPI.sendText(JSON.stringify(colors), $fx.hash, "Colors-"+$fx.hash+".json");

        // 2. Add frame
        floatingframe();
        paper.view.update();
        // 3. Framed PNGs (Black, White, Walnut, Maple)
        var frameOptions = [
            { name: "Black", hex: "#1f1f1f" },
            { name: "White", hex: "#f9f9f9" },
            { name: "Walnut", hex: "#60513D" },
            { name: "Maple", hex: "#ebd9c0" }
        ];
        for (var i = 0; i < frameOptions.length; i++) {
            woodframe.style = { fillColor: frameOptions[i].hex };
            var fileName = "Framed" + frameOptions[i].name + "-" + $fx.hash;
            paper.view.update();

            await studioAPI.sendCanvas(myCanvas,  $fx.hash, fileName+".png");
        }
        // 4. Remove frame
        floatingframe();
        // 5. Blueprint SVG
        for (var z = 0; z < stacks; z++) {
            sheet[z].style = {
                fillColor: null,
                strokeWidth: 0.1,
                strokeColor: lightburn[stacks - z - 1].Hex,
                shadowColor: null,
                shadowBlur: null,
                shadowOffset: null
            };
            sheet[z].selected = true;
        }
        paper.view.update();

        // Send SVG
        await studioAPI.sendSVG(project.exportSVG({asString: true}), $fx.hash, "Blueprint-" + $fx.hash+".svg");
        // 6. Plotting SVG
        for (var z = 0; z < stacks; z++) {
            sheet[z].style = {
                fillColor: null,
                strokeWidth: 0.1,
                strokeColor: plottingColors[stacks - z - 1].Hex,
                shadowColor: null,
                shadowBlur: null,
                shadowOffset: null
            };
            sheet[z].selected = true;
        }
        for (var z = 0; z < stacks; z++) {
            if (z < stacks - 1) {
                for (var zs = z + 1; zs < stacks; zs++) {
                    var old = sheet[z];
                    sheet[z] = clipSubtract(sheet[z], sheet[zs]);
                    old.remove();
                }
            }
        }
        paper.view.update();
        // Send SVG
        await studioAPI.sendSVG(project.exportSVG({asString: true}), $fx.hash, "Plotting-" + $fx.hash+".svg");

        // Send features
        await studioAPI.sendFeatures($fx.hash, features);

        console.log("All exports sent!");
        studioAPI.signalComplete();
    }


      

//vvvvvvvvvvvvvvv PROJECT FUNCTIONS vvvvvvvvvvvvvvv 
 
function somelines(z){
        p = []
        y = R.random_int(0, high);
        p[0]=new Point(0,y)
        y2 = R.random_int(0, high);
        p[1]=new Point(wide,y2)
        lines = new Path.Line (p[0],p[1]); 
        mesh = PaperOffset.offsetStroke(lines, minOffset,{ cap: 'butt' });
        mesh.flatten(4);
        mesh.smooth();
        lines.remove();
        join(z,mesh); 
        mesh.remove();

    
}




//^^^^^^^^^^^^^ END PROJECT FUNCTIONS ^^^^^^^^^^^^^ 




//--------- Helper functions ----------------------- 

function floatingframe(){
    var frameWide=~~(34*ratio);var frameReveal = ~~(12*ratio);
  if (framegap.isEmpty()){
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(~~(wide+frameReveal*2), ~~(high+frameReveal*2)), framradius)
        var insideframe = new Path.Rectangle(new Point(frameReveal, frameReveal),new Size(wide, high)) 
        framegap = clipSubtract(outsideframe, insideframe);
        outsideframe.remove();insideframe.remove();
        framegap.scale(2.2);
        framegap.position = new Point(paper.view.viewSize.width/2, paper.view.viewSize.height/2);
        framegap.style = {fillColor: '#1A1A1A', strokeColor: "#1A1A1A", strokeWidth: 1*ratio};
    } else {framegap.removeChildren()} 
    
    if (woodframe.isEmpty()){
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide+frameWide*2+frameReveal*2, high+frameWide*2+frameReveal*2), framradius)
        var insideframe = new Path.Rectangle(new Point(frameWide, frameWide),new Size(wide+frameReveal*2, high+frameReveal*2)) 
        woodframe = clipSubtract(outsideframe, insideframe);
        outsideframe.remove();insideframe.remove();
        woodframe.scale(2.2);
        woodframe.position = new Point(paper.view.viewSize.width/2, paper.view.viewSize.height/2);
        var framegroup = new Group(woodframe);
        woodframe.style = {fillColor: frameColor, strokeColor: "#60513D", strokeWidth: 2*ratio,shadowColor: new Color(0,0,0,[0.5]),shadowBlur: 20,shadowOffset: new Point(10*2.2, 10*2.2)};
    } else {woodframe.removeChildren()} 
    //fileName = "Framed-"+$fx.hash;
}

function rangeInt(range,x,y,z){
    var v = ~~(range-(noise.get(x,y,z)*range*2));
    return (v);
}

// Add shape s to sheet z
function join(z,s){
    var old = sheet[z];
    sheet[z] = clipUnite(s, sheet[z]);
    old.remove();
    s.remove();
}

// Subtract shape s from sheet z
function cut(z,s){
    var old = sheet[z];
    sheet[z] = clipSubtract(sheet[z], s);
    old.remove();
    s.remove();
}

function drawFrame(z){
    var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide, high), framradius)
    var insideframe = new Path.Rectangle(new Point(framewidth, framewidth),new Size(wide-framewidth*2, high-framewidth*2)) 
    //var outsideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2);
    //var insideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2-framewidth);


    sheet[z] = clipSubtract(outsideframe, insideframe);
    outsideframe.remove();insideframe.remove();
}


function solid(z){
    outsideframe = new Path.Rectangle(new Point(1,1),new Size(wide-1, high-1), framradius)
    //outsideframe = new Path.Circle(new Point(wide/2),wide/2)
    var old = sheet[z];
    sheet[z] = clipUnite(sheet[z], outsideframe);
    old.remove();
    outsideframe.remove();
}



function frameIt(z){
        //Trim to size
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide, high), framradius)
        //var outsideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2);
        var old = sheet[z];
        sheet[z] = clipIntersect(outsideframe, sheet[z]);
        old.remove();
        outsideframe.remove();

        //Make sure there is still a solid frame
        var outsideframe = new Path.Rectangle(new Point(0, 0),new Size(wide, high), framradius)
        var insideframe = new Path.Rectangle(new Point(framewidth, framewidth),new Size(wide-framewidth*2, high-framewidth*2))
        //var outsideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2);
        //var insideframe = new Path.Circle(new Point(wide/2, wide/2),wide/2-framewidth);

        var frame = clipSubtract(outsideframe, insideframe);
        outsideframe.remove();insideframe.remove();
        var old = sheet[z];
        sheet[z] = clipUnite(sheet[z], frame);
        old.remove();
        frame.remove();
         
        
        sheet[z].style = {fillColor: colors[z].Hex, strokeColor: linecolor.Hex, strokeWidth: 1*ratio,shadowColor: new Color(0,0,0,[0.3]),shadowBlur: 20,shadowOffset: new Point((stacks-z)*2.3, (stacks-z)*2.3)};
}

function cutMarks(z){
    if (z<stacks-1 && z!=0) {
          for (etch=0;etch<stacks-z;etch++){
                var layerEtch = new Path.Circle(new Point(50+etch*10,25),2)
                cut(z,layerEtch)
            } 
        }
}

function signature(z){
    shawn = new CompoundPath(sig);
    shawn.strokeColor = 'green';
    shawn.fillColor = 'green';
    shawn.strokeWidth = 1;
    shawn.scale(ratio*.9)
    shawn.position = new Point(wide-framewidth-~~(shawn.bounds.width/2), high-framewidth+~~(shawn.bounds.height));
    cut(z,shawn)
}

function hanger (z){
    if (z < stacks-2 && scale>0){
        var r = 30*ratio;
        rt = 19*ratio;
        if (z<3){r = 19*ratio}
        layerEtch = new Path.Rectangle(new Point(framewidth/2, framewidth),new Size(r*2, r*3), r)
        layerEtch.position = new Point(framewidth/2,framewidth);   
        cut(z,layerEtch)

        layerEtch = new Path.Rectangle(new Point(wide-framewidth/2, framewidth),new Size(r*2, r*3), r)
        layerEtch.position = new Point(wide-framewidth/2,framewidth);   
        cut(z,layerEtch)

        layerEtch = new Path.Rectangle(new Point(wide/2, framewidth/2),new Size(r*4, r*2), r)
        layerEtch.position = new Point(wide/2,framewidth/2);   
        cut(z,layerEtch)
    }
}




//--------- Interaction functions -----------------------
var interactiontext = "Interactions\nB = Blueprint mode\nV = Export SVG\nP = Export PNG\nC = Export colors as TXT\nE = Show layers\nF = Add floating frame\nL = Format for plotting"

view.onDoubleClick = function(event) {
    alert(interactiontext);
    console.log(project.exportJSON());
    //canvas.toBlob(function(blob) {saveAs(blob, tokenData.hash+'.png');});
};

document.addEventListener('keypress', (event) => {

       //Save as SVG 
       if(event.key == "v") {
            var url = "data:image/svg+xml;utf8," + encodeURIComponent(paper.project.exportSVG({asString:true}));
            var key = [];for (l=stacks;l>0;l--){key[stacks-l] = colors[l-1].Name;}; 
            var svg1 = "<!--"+key+"-->" + paper.project.exportSVG({asString:true})
            var url = "data:image/svg+xml;utf8," + encodeURIComponent(svg1);
            var link = document.createElement("a");
            link.download = fileName;
            link.href = url;
            link.click();
            }


        if(event.key == "f") {
            floatingframe();
            
        }
        
        if(event.key == "1") {
            frameColor = {"Hex":"#4C46380", "Name":"Black"};
            fileName = "FramedBlack-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
        if(event.key == "2") {
            frameColor = {"Hex":"#f9f9f9","Name":"White"};
            fileName = "FramedWhite-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
        if(event.key == "3") {
            frameColor = {"Hex":"#60513D","Name":"Walnut"};
            fileName = "FramedWalnut-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
        if(event.key == "4") {
            frameColor = {"Hex":"#ebd9c0","Name":"Maple"};
            fileName = "FramedMaple-"+$fx.hash;
            woodframe.style = {fillColor: frameColor.Hex}
        }
            
        if(event.key == "V") {
            fileName = "Vector-"+$fx.hash;
        }  


       //Format for Lightburn
       if(event.key == "b") {
        fileName = "blueprint-"+$fx.hash;
            for (z=0;z<stacks;z++){
                sheet[z].style = {fillColor: null,strokeWidth: .1,strokeColor: lightburn[stacks-z-1].Hex,shadowColor: null,shadowBlur: null,shadowOffset: null}
                sheet[z].selected = true;}
            }

       //Format for plotting
       if(event.key == "l") {
            fileName = "Plotting-"+$fx.hash;

            for (z=0;z<stacks;z++){
            sheet[z].style = {fillColor: null,strokeWidth: .1,strokeColor: plottingColors[stacks-z-1].Hex,shadowColor: null,shadowBlur: null,shadowOffset: null}
            sheet[z].selected = true;
            }
        
            for (z=0;z<stacks;z++){
                if (z<stacks-1){
                    for (zs=z+1;zs<stacks;zs++){
                        var old = sheet[z];
                        sheet[z] = clipSubtract(sheet[z], sheet[zs]);
                        old.remove();
                    }
                }
                console.log("optimizing")
            }
        }

        //new hash
        if(event.key == " ") {
            setquery("fxhash",null);
            location.reload();
            }

        //help
       if(event.key == "h" || event.key == "/") {
            alert(interactiontext);
            }
             
        //Save as PNG
        if(event.key == "p") {
            canvas.toBlob(function(blob) {saveAs(blob, fileName+'.png');});
            }

        //Export colors as txt
        if(event.key == "c") {
            content = JSON.stringify(features,null,2);
            console.log(content);
            var filename = "Colors-"+$fx.hash + ".txt";
            var blob = new Blob([content], {type: "text/plain;charset=utf-8"});
            saveAs(blob, filename);
            }

        //send to studio.shawnkemp.art
        if(event.key == "s") {
            sendAllExports()
            }  

       //Explode the layers     
       if(event.key == "e") {   
            //floatingframe();  
            h=0;t=0;maxwidth=3000;
               for (z=0; z<sheet.length; z++) { 
               sheet[z].scale(1000/2300)   
               sheet[z].position = new Point(wide/2,high/2);        
                    sheet[z].position.x += wide*h;
                    sheet[z].position.y += high*t;
                    sheet[z].selected = true;
                    if (wide*(h+2) > panelWide) {maxwidth=wide*(h+1);h=0;t++;} else{h++};
                    }  
            paper.view.viewSize.width = maxwidth;
            paper.view.viewSize.height = high*(t+1);
           }
 
}, false); 
}