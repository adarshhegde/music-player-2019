Function.prototype.bind = function(ctx) {
    var fn = this;
    return function() {
        fn.apply(ctx, arguments);
    };
};

let lite = {
    evts:{}
};

function $(target) {
    let j = {
        length: 0,
        evts: {}
    };

    if (!target) return j;

    j.ready = function (x) {
        var that = this;
        var a = new Promise(function (resolve, reject) {
            function resolve2() {
                try {
                    resolve.apply(that);
                }
                catch (err) {
                    reject(err);
                }
            }
            if (document.readyState == "complete") {
                resolve2();
            }
            else if (document.addEventListener) {
                document.addEventListener("DOMContentLoaded", function () {
                    document.removeEventListener("DOMContentLoaded", arguments.callee, false);
                    resolve2();
                }, false);

            }
            else if (document.attachEvent) {
                document.attachEvent("onreadystatechange", function () {
                    if (document.readyState === "complete") {
                        document.detachEvent("onreadystatechange", arguments.callee);
                        resolve2();
                    }
                });
            }
            else {
                reject("kek");
            }
            //  }
        });
        a.then(x).catch((x) => {
            throw new Error(x.stack)
        });
    }

    j.attr = function (attribute, value = null) {
        if (!attribute) throw new ReferenceError("No attribute specified");
        if (value == null) {
            return this[0].getAttribute(attribute);
        }
        else {
            let i = this.length;
            for (let k = 0; k < i; k++)
                this[k].setAttribute(attribute, value);
        }
    }

    j.text = function (txt = null) {
        if (txt == null) {
            return this[0].innerText;
        }
        else {
            let i = this.length;
            for (let k = 0; k < i; k++)
                this[k].innerText = txt;
        }
    }

    j.append = function (el) {
        let i = this.length;
        for (let k = 0; k < i; k++) {
            let l = this[k];

            if (typeof el == "object") {

                for (let m = 0; m < el.length; m++) {
                    let elem = el[m];

                    if (elem.nodeType == 1) {
                        l.appendChild(elem);
                    }

                    else if (elem.nodeType == 3) {
                        l.innerHTML += elem;
                    }
                    else if (/<[a-z][\s\S]*>/i.test(elem)) {
                        let parser = new DOMParser();
                        let nodes = parser.parseFromString(elem, "text/html");
                        let i = nodes.body.childNodes.length;

                        for (let k = 0; k < i; k++) {
                            l.appendChild(nodes.body.childNodes[k]);
                        }

                    }
                    else if (typeof elem == "string" || typeof elem == "number") {

                        l.innerHTML += elem;
                    }

                }
            }
            else {

                if (el.nodeType == 1) {
                    l.appendChild(el);
                }

                else if (el.nodeType == 3) {
                    l.innerHTML += el;
                }

                else if (/<[a-z][\s\S]*>/i.test(el)) {
                    let parser = new DOMParser();
                    let nodes = parser.parseFromString(el, "text/html");
                    let i = nodes.body.childNodes.length;

                    for (let k = 0; k < i; k++) {
                        l.appendChild(nodes.body.childNodes[k]);
                    }
                }

                else if (typeof el == "string" || typeof el == "number") {
                    l.innerHTML += el;
                }
            }
        }
    }

    j.addClass = function (cls) {
        if (!cls) throw new Error("Classname cannot be empty!");
        let x = this.length;
        for (var i = 0; x > i; i++) this[i].classList.add(cls);

    }
    j.removeClass = function (cls) {
        if (!cls) throw new Error("Classname cannot be empty!");
        let x = this.length;
        for (let i = 0; i < x; i++) {
            let el = this[i];
            if (el.classList)
                el.classList.remove(cls);
            else
                el.className = el.className.replace(new RegExp('(^|\\b)' + cls.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
        }
    }

    j.click = function (cb) {
        if (!cb) {
            let x = this.length;
            for (var i = 0; x > i; i++)
                this[i].dispatchEvent("click");
        }
        else {
            this.on("click", cb);
        }
    }

    // j.on = function (evt, cb) {
    //     console.log(lite.evts);
    //     let x = this.length;
    //     let meow = {};
    //     for (let i = 0; i < x; i++) meow[i] = this[i];
    //     let that = this;

    //     Promise.all(Object.keys(meow).map(function (key, index) {

    //         if(!lite.evts.hasOwnProperty(that[key])) lite.evts[that[key]] = {};
    //         if(!lite.evts[that[key]].hasOwnProperty(evt)) lite.evts[that[key]][evt] = [];
    //         lite.evts[that[key]][evt].push(cb);
    
    //         that[key].addEventListener(evt,lite.evts[that[key]][evt][lite.evts[that[key]][evt].length - 1].bind(that[index], arguments));
    //     }));

    // };

   
    // j.off = function (evt, cb) {
    //     console.log(lite.evts);
    //     let x = this.length;
    //     let meow = {};
    //     for (let i = 0; i < x; i++) meow[i] = this[i];
    //     let that = this;

    //     Promise.all(Object.keys(meow).map(function (key, index) {

    //         if(!lite.evts.hasOwnProperty(that[key])) lite.evts[that[key]] = {};
    //         if(!lite.evts[that[key]].hasOwnProperty(evt)) lite.evts[that[key]][evt] = [];
    //         lite.evts[that[key]][evt].push(cb);
    
    //         that[key].removeEventListener(evt,lite.evts[that[key]][evt][lite.evts[that[key]][evt].length - 1].bind(that[index], arguments));
  
  
              
    //     var index = lite.evts[that[key]][evt].indexOf(cb);
    //     if (index > -1) {
    //         lite.evts[that[key]][evt].splice(index, 1);
    //     }

    //     }));
     

    // };

    j.on = function(evt,cb) {
        var l = this.length;
        for(let x = 0; x < l; x++)
        { 
            this[x].addEventListener(evt,cb.bind(this[x]));
        }
    }

    j.off = function(evt,cb) {
        var l = this.length;
        for(let x = 0; x < l; x++)
        {
            this[x].removeEventListener(evt,cb.bind(this[x]));
        }
    }






    if (typeof target == "function") { j.ready(target); return j; }

    if (/<[a-z][\s\S]*>/i.test(target)) {
        let parser = new DOMParser();
        let nodes = parser.parseFromString(target, "text/html");
        let i = nodes.body.childNodes.length;
        for (let k = 0; k < i; k++) {
            j[j.length++] = nodes.body.childNodes[k];
        }
    }

    else {
        switch (target.nodeType) {
            case 1: {
                j[j.length++] = target;
                break;
            }

            case 9:
                j[j.length++] = target;
                break;
            default: {
                try {
                    let nodes = document.querySelectorAll(target);
                    n = nodes.length;
                    for (let i = 0; i < n; i++) {
                        j[i] = nodes[i];
                        j.length++;
                    };
                }
                catch (err) {
                    console.log(err)
                };
            }
        }

    }

    return j;


}

$.get = function (url) {
    return new Promise(function (resolve, reject) {
        fetch(url).then(function (response) {
            resolve(response);
        })
            .catch(function (err) {
                reject(err);
            });
    });
}