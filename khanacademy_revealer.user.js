// ==UserScript==
// @name         Khan Academy Bot
// @version      1.4
// @description  ur welcome cheater
// @author       Alex Dubov (github@adubov1)
// @match        https://www.khanacademy.org/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    window.loaded = false;

    class Answer {
        constructor(answer, type) {
            this.body = answer;
            this.type = type;
        }

        get isMultiChoice() {
            return this.type === "multiple_choice";
        }

        get isFreeResponse() {
            return this.type === "free_response";
        }

        get isExpression() {
            return this.type === "expression";
        }

        get isDropdown() {
            return this.type === "dropdown";
        }

        log() {
            const answer = this.body || [];
            const style = "color: coral; -webkit-text-stroke: .5px black; font-size:24px; font-weight:bold;";
            const sanitizedAnswers = answer.map(ans => {
                if (typeof ans === "string") {
                    if (ans.includes("web+graphie")) {
                        this.printImage(ans);
                        return "";
                    }
                    return ans.replaceAll("$", "");
                }
                return ans;
            });

            const text = sanitizedAnswers.filter(Boolean).join("\n");
            if (text) {
                console.log(`%c${text.trim()} `, style);
            }
        }

        printImage(ans) {
            const url = ans.replace("![](web+graphie", "https").replace(")", ".svg");
            const image = new Image();
            image.src = url;
            image.onload = () => {
                const imageStyle = [
                    `font-size: 1px;`,
                    `line-height: ${image.height}px;`,
                    `padding: ${image.height / 2}px ${image.width / 2}px;`,
                    `background-size: ${image.width}px ${image.height}px;`,
                    `background: url(${url});`
                ].join(' ');
                console.log('%c ', imageStyle);
            };
        }
    }

    const originalFetch = window.fetch;
    window.fetch = function () {
        return originalFetch.apply(this, arguments).then(async (res) => {
            if (res.url.includes("/getAssessmentItem")) {
                const clone = res.clone();
                const json = await clone.json();

                let item, question;

                try {
                    item = json.data.assessmentItem.item.itemData;
                    question = JSON.parse(item).question;
                } catch (error) {
                    const errorIteration = parseInt(localStorage.getItem("error_iter") || "0", 10);
                    localStorage.setItem("error_iter", errorIteration + 1);

                    if (errorIteration < 4) {
                        location.reload();
                    } else {
                        console.error("%cAn error occurred: " + error.message, "color: red; font-weight: bolder; font-size: 20px;");
                    }
                    return;
                }

                if (!question) return;

                Object.keys(question.widgets).forEach(widgetName => {
                    const widget = question.widgets[widgetName];
                    switch (widgetName.split(" ")[0]) {
                        case "numeric-input":
                        case "input-number":
                            freeResponseAnswerFrom(widget).log();
                            break;
                        case "radio":
                            multipleChoiceAnswerFrom(widget).log();
                            break;
                        case "expression":
                            expressionAnswerFrom(widget).log();
                            break;
                        case "dropdown":
                            dropdownAnswerFrom(widget).log();
                            break;
                    }
                });
            }

            if (!window.loaded) {
                console.clear();
                console.log("%c Answer Revealer ", "color: mediumvioletred; -webkit-text-stroke: .5px black; font-size:40px; font-weight:bolder; padding: .2rem;");
                console.log("%cCreated by Alex Dubov (@adubov1)", "color: white; -webkit-text-stroke: .5px black; font-size:15px; font-weight:bold;");
                window.loaded = true;
            }

            return res;
        });
    };

    function freeResponseAnswerFrom(widget) {
        const answer = (widget.options?.answers || [])
            .filter(answer => answer.status === "correct")
            .map(answer => answer.value);
        return new Answer(answer, "free_response");
    }

    function multipleChoiceAnswerFrom(widget) {
        const answer = (widget.options?.choices || [])
            .filter(choice => choice.correct)
            .map(choice => choice.content);
        return new Answer(answer, "multiple_choice");
    }

    function expressionAnswerFrom(widget) {
        const answer = (widget.options?.answerForms || [])
            .filter(answerForm => answerForm.status === "correct")
            .map(answerForm => answerForm.value);
        return new Answer(answer, "expression");
    }

    function dropdownAnswerFrom(widget) {
        const answer = (widget.options?.choices || [])
            .filter(choice => choice.correct)
            .map(choice => choice.content);
        return new Answer(answer, "dropdown");
    }
})();
