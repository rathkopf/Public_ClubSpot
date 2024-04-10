"use strict";
// EntryListPage.ts
class EntryListPage {
    static create(document, tableFoundEvent) {
        const regexPattern = /^https?:\/\/theclubspot.com\/dashboard\/regatta\/[^\/]+\/(entry-list\/?)?$/;
        if (!regexPattern.test(document.URL)) {
            return null;
        }
        return new EntryListPage(document, tableFoundEvent);
    }
    constructor(document, tableFoundEvent) {
        this.tableFoundEvent = (_) => { };
        this.SEARCH_INTERVAL = 500;
        this.table = undefined;
        this.TableChangedEvent = (_) => { };
        this.tableChangedObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    this.tableChangedObserver.disconnect();
                    this.RaiseTablesChangedEvent();
                }
            }
        });
        this.TableFoundEvent = tableFoundEvent;
        this.document = document;
    }
    set TableFoundEvent(tableFoundEvent) {
        this.tableFoundEvent = tableFoundEvent;
        if (this.TableFoundEvent && this.table) {
            this.TableFoundEvent(this.table);
        }
    }
    get TableFoundEvent() {
        return this.tableFoundEvent;
    }
    set FindTableEnabled(enableTableSearch) {
        if (this.FindTableEnabled === enableTableSearch) {
            return;
        }
        if (enableTableSearch) {
            this.tableSearchTimer = setInterval(() => {
                this.findTable();
            }, this.SEARCH_INTERVAL);
            this.findTable();
        }
        else {
            if (this.tableSearchTimer) {
                clearInterval(this.tableSearchTimer);
            }
            this.tableSearchTimer = undefined;
        }
    }
    get FindTableEnabled() {
        return !!this.tableSearchTimer;
    }
    findTable() {
        const allDivs = this.document.querySelectorAll('div.standardCardBody.scrollable.noPadding.fff');
        allDivs.forEach((div) => {
            const precedingDiv = div.previousElementSibling;
            if (precedingDiv && precedingDiv.tagName === 'DIV') {
                let h3 = precedingDiv.querySelector('h3');
                if (h3 && h3.textContent.includes('Entry list')) {
                    let table = div.querySelector('table');
                    if (table) {
                        this.table = table;
                        this.RaiseTableFoundEvent();
                        return;
                    }
                }
            }
        });
    }
    ;
    RaiseTableFoundEvent() {
        var _a;
        if (!this.table) {
            return;
        }
        (_a = this.TableFoundEvent) === null || _a === void 0 ? void 0 : _a.call(this, this.table);
    }
    set EnableTableChangedEvent(tableParent) {
        if (tableParent) {
            this.AddDivWatcher(tableParent);
        }
        else {
            this.tableChangedObserver.disconnect();
        }
    }
    AddDivWatcher(tableParent) {
        this.tableChangedObserver.disconnect();
        this.tableChangedObserver.observe(tableParent, { childList: true, subtree: true });
    }
    RaiseTablesChangedEvent() {
        var _a;
        if (!this.table) {
            return;
        }
        (_a = this.TableChangedEvent) === null || _a === void 0 ? void 0 : _a.call(this, this.table);
    }
}
// ScoringPanelPage.ts
class ScoringPanelPage {
    static create(document) {
        const regexPattern = /^https?:\/\/theclubspot.com\/scoring\/[^\/]+\/?$/;
        if (!regexPattern.test(document.URL)) {
            return null;
        }
        return new ScoringPanelPage(document);
    }
    constructor(document) {
        var _a;
        this.document = document;
        this.SEARCH_INTERVAL = 200;
        this.TableChangedEvent = (_) => { };
        this.OnFinishTimeDivChange = (visible) => {
            if (visible) {
                this.ModifyFinishWindow();
            }
        };
        this.settingsStorage = new LocalStorageHandler(ScoringPanelSettings);
        this.settings = (_a = this.settingsStorage.load()) !== null && _a !== void 0 ? _a : new ScoringPanelSettings();
        this.finishTimeEnabled = this.settings.enableDateInput;
        this.WatchForFinishTimeDivChanges('#overlay_finish-time', this.OnFinishTimeDivChange);
        this.uiManipulator = new UIManipulator(document);
    }
    ModifyFinishWindow() {
        this.DisableDateInputs();
        this.FixTimeInputs();
        this.replaceDivAfterH3WithDateSwitch();
    }
    replaceDivAfterH3WithDateSwitch() {
        const div = this.document.querySelector('h3:contains("Finish time") + .flexGrowOne');
        if (div) {
            this.uiManipulator.replaceDiv(div, this.createDateToggleDiv());
        }
    }
    createDateToggleDiv() {
        const div = this.uiManipulator.createDivWithClass('flexGrowOne');
        div.style.alignSelf = 'center';
        const rightAlignedDiv = this.uiManipulator.createDivWithClass('flexWrapRightAlign', 'tinyPaddingTop');
        // add a div with right alignment
        div.appendChild(rightAlignedDiv);
        const labelDiv = this.document.createElement('div');
        labelDiv.outerHTML = '<div class="flexNoWrap"><p class="inline-label noMinWidth">Enable Date</p></div>';
        labelDiv.appendChild(this.uiManipulator.createTooltip('Turn this switch on to change the finish date.'));
        rightAlignedDiv.appendChild(labelDiv);
        rightAlignedDiv.appendChild(this.uiManipulator.createToggle(this.toggleFinishDate));
        div.appendChild(rightAlignedDiv);
        return div;
    }
    DisableDateInputs() {
        const dateInputs = this.document.querySelectorAll('.dateInput.flexGrowOne.flexNoWrap.smallerMarginTop:first-of-type input.required');
        dateInputs.forEach(input => {
            input.disabled = true;
            input.style.color = 'lightgray';
            input.classList.remove('required');
        });
    }
    FixTimeInputs() {
        const inputs = this.document.querySelectorAll('.dateInput.flexGrowOne.flexNoWrap.smallerMarginTop:last-of-type input.required');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                const currentIndex = Array.from(inputs).indexOf(input);
                const nextInput = inputs[currentIndex + 1] || inputs[0];
                if (input.value.length === 2) {
                    nextInput.focus();
                    nextInput.select();
                }
            });
        });
        const firstTimeInput = inputs[0];
        if (firstTimeInput) {
            firstTimeInput.focus();
            firstTimeInput.select();
        }
    }
    WatchForFinishTimeDivChanges(selector, callback) {
        setInterval(() => {
            const element = this.document.querySelector(selector);
            const visible = !!element && element.style.display !== 'none';
            if (this.finishTimeEnabled === visible) {
                return;
            }
            else {
                this.finishTimeEnabled = visible;
                callback(visible);
            }
        }, this.SEARCH_INTERVAL);
    }
    toggleFinishDate() {
        console.debug('toggleFinishDate');
    }
}
// ScoringPanelSettings.ts
/*
the next steps:
- make UI element that will toggel the date input
- put appropriate classes on the date input for the setting
- have the date input set the lastDateUsed property.
*/
class SettingsBase {
    constructor() {
        this.onChange = () => { };
    }
}
class ScoringPanelSettings extends SettingsBase {
    get enableDateInput() {
        return this._enableDateInput;
    }
    set enableDateInput(value) {
        if (this._enableDateInput === value) {
            return;
        }
        this._enableDateInput = value;
        this.onChange();
    }
    get lastDateUsed() {
        return new Date(this._lastDateUsed.getDate());
    }
    set lastDateUsed(value) {
        if (this._lastDateUsed == value) {
            return;
        }
        this._lastDateUsed = new Date(value.getDate());
        this.onChange();
    }
}
// UIManipulator.ts
class UIManipulator {
    constructor(document) {
        this.document = document;
    }
    createDivWithClass(...className) {
        const newDiv = this.document.createElement('div');
        className.forEach((name) => {
            newDiv.classList.add(name);
        });
        return newDiv;
    }
    replaceDiv(destinationDiv, newDiv) {
        if (destinationDiv) {
            destinationDiv.outerHTML = newDiv.outerHTML;
        }
        return destinationDiv;
    }
    replaceFlexGrowOneDiv(destinationDiv) {
        if (destinationDiv) {
            const newDiv = this.document.createElement('div');
            newDiv.classList.add('flexGrowOne');
            newDiv.style.alignSelf = 'center';
            const innerDiv = this.document.createElement('div');
            innerDiv.classList.add('flexWrapRightAlign', 'tinyPaddingTop');
            const labelDiv = this.document.createElement('div');
            labelDiv.classList.add('flexNoWrap');
            const label = document.createElement('p');
            label.classList.add('inline-label', 'noMinWidth');
            label.textContent = 'Enable Date';
            const tooltipWrapper = this.createTooltip('Turn this switch on to change the finish date.');
            const toggle = this.createToggle();
            labelDiv.appendChild(label);
            labelDiv.appendChild(tooltipWrapper);
            innerDiv.appendChild(labelDiv);
            innerDiv.appendChild(toggle);
            newDiv.appendChild(innerDiv);
            destinationDiv.outerHTML = newDiv.outerHTML;
        }
    }
    createToggle(callack) {
        const wapperDiv = document.createElement('div');
        wapperDiv.classList.add('toggleWrap', 'ease');
        wapperDiv.onclick = callack;
        wapperDiv.style.marginTop = '0px';
        wapperDiv.style.marginLeft = '-2px';
        const toggleSlider = document.createElement('div');
        toggleSlider.classList.add('toggleSlider', 'ease');
        wapperDiv.appendChild(toggleSlider);
        return wapperDiv;
    }
    createTooltip(tooltipText) {
        const tooltipWrapper = document.createElement('div');
        tooltipWrapper.classList.add('tooltipDotWrapper');
        const tooltipDot = document.createElement('div');
        tooltipDot.classList.add('tooltipDot', 'info', 'tooltip');
        const tooltipSpan = document.createElement('span');
        tooltipSpan.classList.add('tooltipText', 'easeFast');
        tooltipSpan.textContent = tooltipText;
        tooltipDot.appendChild(tooltipSpan);
        tooltipWrapper.appendChild(tooltipDot);
        return tooltipWrapper;
    }
}
// main_script.ts
(function () {
    // Function to apply the background color
    function applyBackgroundColor(row) {
        row.style.backgroundColor = 'mistyrose';
    }
    let elDocument = null;
    let spPage = null;
    window.addEventListener('load', () => {
        elDocument = EntryListPage.create(document, TableFoundEvent);
        if (elDocument) {
            elDocument.FindTableEnabled = true;
            return;
        }
        spPage = ScoringPanelPage.create(document);
        if (spPage) {
            return;
        }
    });
    function TableFoundEvent(table) {
        const tableRows = table.querySelectorAll('tr');
        if (elDocument && tableRows.length > 1) {
            elDocument.FindTableEnabled = false;
            tableRows.forEach((row) => {
                var _a;
                if ((_a = row.textContent) === null || _a === void 0 ? void 0 : _a.includes('CYC')) {
                    applyBackgroundColor(row);
                }
            });
            const tableParentDiv = table.closest('div.view.view_entry-list.active');
            if (tableParentDiv) {
                elDocument.TableChangedEvent = TableChangedEvent;
                elDocument.EnableTableChangedEvent = tableParentDiv;
            }
        }
    }
    function TableChangedEvent(_) {
        if (elDocument) {
            elDocument.EnableTableChangedEvent = undefined;
            elDocument.FindTableEnabled = true;
        }
    }
})();
// storage.ts
// Define a class to handle local storage operations
class LocalStorageHandler {
    // Copiolot search term "if i have a generic T in typescript, can I find what type T represents?"
    constructor(TCtor) {
        this.settingsCtor = TCtor;
        const typeName = TCtor.name;
        const currentUrl = window.location.href;
        const regex = /\/([^/]+)\/?$/; // Regular expression to match the last part of the URL
        const match = regex.exec(currentUrl);
        const raceKey = match ? match[1] : '';
        this.localStorageKey = `${typeName}_${raceKey}`;
    }
    // Save data to local storage
    save(data) {
        localStorage.setItem(this.localStorageKey, JSON.stringify(data));
    }
    // Retrieve data from local storage
    load() {
        const data = localStorage.getItem(this.localStorageKey);
        let result;
        if (data) {
            result = JSON.parse(data);
        }
        else {
            result = new this.settingsCtor();
        }
        result.onChange = () => {
            this.save(result);
        };
        return result;
    }
}
