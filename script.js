// Nothing of interest can be found in this messy code, look further
(function() {
    Array.prototype.toString = function () {
        return this.join(", ")
    };

    /**
     * @typedef {Object} Ideogram
     * @prop {String} meaning - Meaning of this ideogram (can have two)
     * @prop {Array<Array|String>} [draw] - List of instruction for the draw (can be omitted to use only for reference)
     * @prop {Array<String>} [synonyms] - Other meaning for this ideogram
     * @prop {Array<String>} [split] - Tell how to split this word into smaller one (when draw is omitted)
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
        // Register all known words
        let englishWords = [];
        let ptalothWords = Object.keys(json).map(function(key) {
            return {
                label: `${key} (${json[key].meaning})`,
                value: key
            };
        });
        // Find potential break-down meaning for ideogram (look into console)
        let regex = new RegExp("(" + Object.keys(json).map(function(phoneme) {
            return phoneme.replace(/(\W)/g, "\\$1");
        }).join("|") + ")", "gi");

        Object.keys(json).forEach(function(ideogram) {
            let data = this[ideogram];

            englishWords.push(data.meaning);
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
                drawIdeogram(keyCtx, 1, 2, ideogram, keyWidth - 2);
                keyCtx.stroke();
                let img = new Image();
                img.title = `${ideogram} (${data.meaning})`;
                img.src = keyCanvas.toDataURL();
                img.addEventListener("click", function() {
                    input.value += (/ $/.test(input.value) ? "" : " ") + (switcher.checked ? data.meaning : ideogram) + " ";
                    onKeyUp(input.value);
                });
                keyboard.appendChild(img);
            }
        }, json);

        // Display ideogram in string
        function toString (ideogram) {
            if (json[ideogram]) {
                return `${ideogram} (${json[ideogram].meaning})`;
            }
            else {
                return "";
            }
        }

        function drawIdeogram(ctx, x, y, name, width) {
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
        }

        // Display ideograms in canvas
        const drawResult = (function() {
            let margin = 50;
            let width = 50;
            let height = width * 2;
            let lineWidth = 8;

            output.width = document.body.offsetWidth;
            let ctx = output.getContext("2d");

            function findFont(text, space, max) {
                let current = max;
                let measure;

                do {
                    ctx.font = current + "px arial";
                    measure = ctx.measureText(text).width;
                } while (--current > 0 && measure > space);
            }

            /**
             * Draw all the ideogram
             * @param {Array<String>} ideograms - Names of the ideograms
             */
            return function(ideograms) {
                let length = ideograms.length;
                output.height = Math.ceil(ideograms.reduce(function(sum, ideogram) {
                    return sum + (Array.isArray(ideogram) ? ideogram.length : 1) * width + margin;
                }, margin * 2) / ctx.canvas.width) * (height + margin * 2);
                ctx.lineWidth = lineWidth;
                ctx.lineCap = "round";
                ctx.lineJoin = "round";
                ctx.strokeStyle = "#333";
                ctx.textAlign = "center";

                let x = margin;
                let y = margin;

                ctx.beginPath();
                for (let i = 0; i < length; ++i) {
                    let ideogram = ideograms[i];
                    let name = "";
                    let meaning = "";
                    let space = (Array.isArray(ideogram) ? ideogram.length : 1) * width + margin;

                    if (x + space > ctx.canvas.width) {
                        x = margin;
                        y += height + margin * 2;
                    }

                    if (Array.isArray(ideogram)) {
                        ideogram.forEach(function(part, index) {
                            drawIdeogram(ctx, x + (index * width), y, part, width);
                        });
                        name = ideogram.join("");
                        meaning = ideogram.map(function(part) {
                            return json[part].meaning;
                        }).join(" ");
                    }
                    else {
                        drawIdeogram(ctx, x, y, ideogram, width);
                        name = ideogram;
                        meaning = json[ideogram].meaning;
                    }

                    ctx.fillStyle = "#aaa";
                    findFont(name, space, 35);
                    ctx.fillText(name, x + (space - margin) / 2, y - 20);

                    ctx.fillStyle = "#FA0F41";
                    findFont(meaning, space, 35);
                    ctx.fillText(meaning, x + (space - margin) / 2, y + height + 40);

                    x += space;
                }

                ctx.stroke();
                ctx.closePath();
            }
        })();

        // Change translation direction
        switcher.addEventListener("change", function () {
            localStorage.setItem("switch", switcher.checked ? 1: 0);
            onKeyUp(input.value);
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
            autocomplete.list = switcher.checked ? englishWords : ptalothWords;
            location.hash = (switcher.checked ? 1: 0) + input.value.replace(/ /g, "+");
        });
        switcher.checked = (location.hash.length > 2 && +location.hash.substr(1, 1)) ||
            +localStorage.getItem("switch");

        let autocomplete = new Awesomplete(input, {
            list: switcher.checked ? englishWords : ptalothWords,
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
                this.input.value = before + text.value + " ";
            }
        });

        function onKeyUp() {
            let value = input.value;
            localStorage.setItem("input", value);
            location.hash = (switcher.checked ? 1: 0) + value.replace(/ /g, "+");

            let written = value.toString().split(/( |[^'\w]|'.+?|\d)/).filter(function (word) {
                return word && word !== " ";
            }).map(function (word) {
                return word.toLowerCase();
            });
            let words = [];

            // Reverse look-up
            if (switcher.checked) {
                let keys = Object.keys(json);
                let keysLength = keys.length;
                written.forEach(function (word) {
                    let found = false;
                    for (let i = 0; i < keysLength && !found; ++i) {
                        let data = json[keys[i]];
                        let meanings = [data.meaning];
                        if (data.synonyms && data.synonyms.length) {
                            meanings = meanings.concat(data.synonyms);
                        }
                        if (meanings.some(function (element) {
                                return element.toLowerCase() === word;
                            })) {
                            if (!data.draw && data.split && data.split.length) {
                                found = data.split;
                            }
                            else {
                                found = keys[i];
                            }
                        }
                    }
                    if (found) {
                        words.push(found);
                    }
                });
            }
            else {
                words = written.map(function(word) {
                    let data = json[word];
                    if (data) {
                        return data.split && data.split.length ? data.split : word;
                    }
                }).filter(word => word);
            }

            drawResult(words);
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