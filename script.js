// Nothing of interest can be found in this messy code, look further
(function() {
    function browse (object, action) {
        for (let key in object) {
            if (object.hasOwnProperty(key)) {
                action(key, object[key], object);
            }
        }
    }
    Array.prototype.toString = function () {
        return this.join(", ")
    };
    Array.prototype.last = function() {
        return this[this.length - 1];
    };
    String.prototype.last = function() {
        return Array.prototype.last.call(this);
    };

    /**
     * @typedef {Object} Ideogram
     * @prop {String|Array} meaning - Meaning of this ideogram (can have two)
     * @prop {Array<Array|String>} [draw] - List of instruction for the draw (can be omitted to use only for reference)
     * @prop {Array<String>} [synonyms] - Other meaning for this ideogram
     */

    let input = document.getElementById("input");
    let switcher = document.getElementById("switch");
    let output = document.getElementById("output");
    let keyboard = document.getElementById("keyboard");

    // Fetch data and parse to json
    let url = "./data.json";
    fetch(url).then(function(response) {
        if (response.ok) {
            return response.json();
        }
    }).then(/** @param {Object<Ideogram>} json */ function(json) {
        console.log("Json ok");

        //
        let keyCanvas = document.createElement("canvas");
        let keyWidth = 16;
        keyCanvas.width = keyWidth;
        keyCanvas.height = keyWidth * 2;
        let keyCtx = keyCanvas.getContext("2d");
        keyCtx.lineWidth = 2;
        keyCtx.lineCap = "round";
        keyCtx.lineJoin = "round";
        keyCtx.strokeStyle = "#333";
        keyCtx.imageSmoothingEnabled = false;
        // Register all known english words
        let englishWords = [];
        // Find potential break-down meaning for ideogram (look into console)
        let regex = new RegExp("(" + Object.keys(json).map(function(phoneme) {
            return phoneme.replace(/(\W)/g, "\\$1");
        }).join("|") + ")", "gi");
        browse(json, function(ideogram, data) {
            englishWords = englishWords.concat(data.meaning);
            if (data.synonyms) {
                englishWords = englishWords.concat(data.synonyms);
            }

            let brokeDown = ideogram.match(regex);
            // the whole ideogram can be broke down
            if (brokeDown.length > 1 && ideogram.replace(regex, "") === "") {

                console.log(toString(ideogram) + " can also mean " + brokeDown.map(function(part) {
                    return toString(part);
                }).join(" "));

                json[ideogram].breakDown = brokeDown.map(function(part) {
                    return json[part];
                });
            }

            // Add the drawing to the keyboard
            if (data.draw) {
                keyCtx.clearRect(0, 0, keyWidth, keyWidth * 2);
                keyCtx.beginPath();
                drawIdeogram(keyCtx, 1, 2, ideogram, keyWidth - 2, false);
                keyCtx.stroke();
                let img = new Image();
                img.title = ideogram;
                img.src = keyCanvas.toDataURL();
                img.addEventListener("click", function() {
                    input.value += (!input.value.length || input.value.last() === " " ? "": " ") + [].concat(switcher.checked ? data.meaning : ideogram)[0] + " ";
                    onKeyUp(input.value);
                });
                keyboard.appendChild(img);
            }
        });

        // Display ideogram in string
        function toString (ideogram) {
            if (json[ideogram]) {
                return `${ideogram} (${json[ideogram].meaning})`;
            }
            else {
                return "";
            }
        }

        function drawIdeogram(ctx, x, y, name, width, withText) {
            const pi2 = Math.PI * 2;
            let height = width * 2;
            let ideogram = json[name];

            // Draw strokes
            ideogram.draw.forEach(function (draw) {
                if (Array.isArray(draw)) {
                    draw.forEach(function (pos, index) {
                        let posX = ((pos - 1) % 3) * (width / 2);
                        let posY = Math.floor((pos - 1) / 3) * (height / 2);
                        if (!index) {
                            ctx.moveTo(x + posX, y + posY);
                        }
                        ctx.lineTo(x + posX, y + posY);
                    });
                }
                else {
                    let posY;
                    if (draw === "top") {
                        posY = height / 4;
                    }
                    else if (draw === "bottom") {
                        posY = height * 3 / 4;
                    }
                    ctx.moveTo(x + width, y + posY);
                    ctx.arc(x + width / 2, y + posY, width / 2, 0, pi2);
                }
            });

            if (withText) {
                let text;

                ctx.fillStyle = "#aaa";
                text = name.toString();
                ctx.font = Math.min(Math.floor(3.5 * width / text.length), 35) + "px arial";
                ctx.fillText(text, x + width / 2, y - 20);

                ctx.fillStyle = "#FA0F41";
                text = ideogram.meaning.toString();
                ctx.font = Math.min(Math.floor(3.5 * width / text.length), 35) + "px arial";
                ctx.fillText(text, x + width / 2, y + height + 40);
            }
        }

        // Display ideograms in canvas
        const drawResult = (function() {
            let margin = 50;
            let width = 50;
            let height = width * 2;
            let lineWidth = 8;

            output.width = document.body.offsetWidth;
            let nbPerLine = Math.floor((output.width - margin) / (width + margin));
            let ctx = output.getContext("2d");

            /**
             * Draw all the ideogram
             * @param {Array<String>} ideograms - Names of the ideograms
             */
            return function(ideograms) {
                let length = ideograms ? ideograms.length : 0;
                output.height = Math.ceil(length / nbPerLine) * (height + margin) + margin;
                ctx.lineWidth = lineWidth;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.strokeStyle = "#333";
                ctx.textAlign = "center";

                ctx.beginPath();
                for (let i = 0; i < length; ++i) {
                    let x = margin + (width + margin) * (i % nbPerLine);
                    let y = margin + (height + margin) * Math.floor(i / nbPerLine);

                    drawIdeogram(ctx, x, y, ideograms[i], width, true);
                }
                ctx.stroke();
                ctx.closePath();
            }
        })();

        let autocomplete = new Awesomplete(input, {
            autoFirst: true,
            minChars: 1,
            filter: function(text, input) {
                if (/ $/.test(input)) {
                    return false;
                }
                else {
                    return Awesomplete.FILTER_STARTSWITH(text, input.match(/[^ ]*$/)[0]);
                }
            },
            item: function(text, input) {
                return Awesomplete.ITEM(text, input.match(/[^ ]*$/)[0]);
            },
            replace: function(text) {
                let before = this.input.value.match(/^.+ \s*|/)[0];
                this.input.value = before + text + " ";
            }
        });
        autocomplete.list = switcher.checked ? englishWords : Object.keys(json);

        // Change translation direction
        switcher.addEventListener("change", function () {
            localStorage.setItem("switch", switcher.checked ? 1: 0);
            onKeyUp(input.value);
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
            autocomplete.list = switcher.checked ? englishWords : Object.keys(json);
            location.hash = (switcher.checked ? 1: 0) + input.value.replace(/ /g, "+");
        });
        switcher.checked = (location.hash.length > 2 && +location.hash.substr(1, 1)) ||
            +localStorage.getItem("switch");

        function onKeyUp() {
            let value = input.value;
            localStorage.setItem("input", value);
            location.hash = (switcher.checked ? 1: 0) + value.replace(/ /g, "+");

            let words = value.toString().split(/( |[^'\w]|'.+?|\d)/).filter(function (word) {
                return word && word !== " ";
            }).map(function (word) {
                return word.toLowerCase();
            });

            // Reverse look-up
            if (switcher.checked) {
                let tmp = words;
                words = [];
                let keys = Object.keys(json);
                let keysLength = keys.length;
                tmp.forEach(function (word) {
                    let found;
                    for (let i = 0; i < keysLength && !found; ++i) {
                        let data = json[keys[i]];
                        let meaning = [].concat(data.meaning);
                        if (data.synonyms) {
                            meaning = meaning.concat(data.synonyms);
                        }
                        if (meaning.some(function (element) {
                                return element.toLowerCase() === word;
                            })) {
                            found = keys[i].split(" ");
                        }
                    }
                    words.push.apply(words, found);
                });
            }

            drawResult(words.filter(function(word) {
                return json[word];
            }));
        }
        // Update input
        input.addEventListener("keyup", function() {
            onKeyUp();
        });
        input.value = (location.hash.length > 1 && location.hash.substr(2).replace(/\+/g, " ")) ||
            localStorage.getItem("input");
        onKeyUp();

        // Clear input
        document.getElementById("clear").addEventListener("click", function() {
            input.value = "";
            onKeyUp();
            input.focus();
        });
    })
})();