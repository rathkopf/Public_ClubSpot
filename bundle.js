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
// RaceDetailsPage.ts
class RaceDetailsPage {
    static create(document) {
        // https://theclubspot.com/dashboard/regatta/VTjfs9q0dy/race-details/j2m02BfxCX/starts
        // const regexPattern = /^https?:\/\/theclubspot.com\/dashboard\/regatta\/[^\/]+\/(edit-start\/?)?$/;
        const regexPattern = /^https?:\/\/theclubspot.com\/dashboard\/regatta\/[^\/]+\/race-details\/[^\/]+(\/starts)?\/?$/;
        if (!regexPattern.test(document.URL)) {
            return null;
        }
        return new RaceDetailsPage(document);
    }
    constructor(document) {
        this.document = document;
        this.SEARCH_INTERVAL = 200;
        this.lastrowCount = 0;
        this.startsTableVisible = false;
        this.editStartsVisible = false;
        this.settingsStorage = new LocalStorageHandler(RaceDetailsSettings);
        this.settings = this.settingsStorage.getSettings();
        // mutation observer doesn't do it.
        // will need to just check the number of rows in the table
        // wait 500 ms before starting to look for table changes
        setTimeout(() => {
            this.watchForTabChanges();
        }, 500);
    }
    watchForTabChanges() {
        setInterval(() => {
            const regexPatternStarts = /^https?:\/\/theclubspot.com\/dashboard\/regatta\/[^\/]+\/race-details\/[^\/]+(\/starts)\/?$/;
            const regexPatternEditStart = /^https?:\/\/theclubspot.com\/dashboard\/regatta\/[^\/]+\/race-details\/[^\/]+(\/edit-start)\/?$/;
            if (regexPatternStarts.test(this.document.URL)) {
                this.startsTableVisible = true;
                const table = this.document.querySelector('.view_starts table.tableInsert');
                const rowCount = table === null || table === void 0 ? void 0 : table.querySelectorAll('tr').length;
                if (!!rowCount && rowCount !== this.lastrowCount) {
                    if (this.lastrowCount && rowCount > this.lastrowCount) {
                        this.onStartAdded(table.rows[rowCount - 1]);
                    }
                    this.lastrowCount = rowCount;
                }
            }
            else if (regexPatternEditStart.test(this.document.URL)) {
                if (!this.editStartsVisible) {
                    this.onEditStartsBecameVisible();
                }
                this.editStartsVisible = true;
            }
            else {
                this.startsTableVisible = false;
            }
        }, this.SEARCH_INTERVAL);
    }
    onEditStartsBecameVisible() {
        if (this.settings.lastStartAddedTime.getTime() - new Date().getTime() < 1000) {
            const link = Array.from(document.querySelectorAll('.standardCardFooter .cardFooterLink'))
                .find(anchor => { var _a; return (_a = anchor.textContent) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes('edit'); });
            if (link) {
                link.click();
            }
        }
    }
    onStartAdded(tr) {
        console.log(`added row ${tr.outerHTML}`);
        const raceName = tr.getAttribute('data-class-id');
        if (raceName) {
            // then we will use this and see how long it has been for checking if we auto-click the edit button.
            this.settings.setRaceAddedTime(raceName, new Date);
        }
        tr.click();
    }
}
// SettingsBase.ts
class SettingsBase {
    constructor() {
        this.onChange = () => { };
        // keep this in case we need to clear out old settings
        this.lastSettingsChange = null;
    }
}
// RaceDetailsSettings.ts
/// <reference path="SettingsBase.ts" />
class RaceDetailsSettings extends SettingsBase {
    constructor() {
        super(...arguments);
        // I probably won't need all of these. I was hoping that the start detail
        // page would have the race ID.
        this.raceAddedTimes = new Map();
    }
    set lastStartAddedTime(value) {
        if (this._lastStartAddedTime == value) {
            return;
        }
        this._lastStartAddedTime = value;
        this.onChange();
    }
    get lastStartAddedTime() {
        return new Date(this._lastStartAddedTime);
    }
    setRaceAddedTime(race, value) {
        if (value == this.raceAddedTimes.get(race)) {
            return;
        }
        this.raceAddedTimes.set(race, value);
        this.onChange();
    }
    getRaceAddedTime(race) {
        return this.raceAddedTimes.get(race);
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
        this.document = document;
        this.SEARCH_INTERVAL = 200;
        this.isFinishTimeInputVisible = false;
        this.onFinishTimeDivVisibleChange = (visible) => {
            if (visible) {
                this.modifyFinishWindow();
            }
            else {
                const searchField = this.document.querySelector('.scoring_search_bar.medium-placeholder');
                searchField.focus();
            }
        };
        this.settingsStorage = new LocalStorageHandler(ScoringPanelSettings);
        this.settings = this.settingsStorage.getSettings();
        this.watchForFinishTimeDivVisibleChanges('#overlay_finish-time');
        this.uiManipulator = new UIManipulator(document);
    }
    modifyFinishWindow() {
        this.setEnabledInputStyles();
        this.setDateInputsEnabledState(this.settings.enableDateInput);
        this.fixDateInputs();
        this.fixTimeInputs();
        this.replaceDivAfterH3WithDateSwitch();
        this.hideScoreInputTypeSelector();
        this.addInputEventHandlerOnDateToSaveDate();
    }
    setEnabledInputStyles() {
        this.disableInputColor = 'lightgray';
        this.enabledInputColor = this.getDateInputs()[0].style.color;
    }
    replaceDivAfterH3WithDateSwitch() {
        const div = $("h3:contains('Finish time') ~ .flexGrowOne").get(0);
        if (div) {
            this.createDateToggleDiv(div);
        }
    }
    hideScoreInputTypeSelector() {
        const div = this.document.querySelector('.scoreInputTypeSelector');
        if (div) {
            div.style.display = 'none';
        }
    }
    createDateToggleDiv(div) {
        div = this.uiManipulator.addClassesToDiv(div, 'flexGrowOne', 'tinyPaddingRight');
        div.style.alignSelf = 'center';
        const rightAlignedDiv = this.uiManipulator.createDivWithClass('flexWrapRightAlign', 'tinyPaddingTop');
        // add a div with right alignment
        div.appendChild(rightAlignedDiv);
        let labelDiv = this.document.createElement('div');
        rightAlignedDiv.appendChild(labelDiv);
        labelDiv.outerHTML = '<div class="flexNoWrap"><p class="inline-label noMinWidth">Enable Date</p></div>';
        labelDiv = rightAlignedDiv.querySelector('div');
        labelDiv.appendChild(this.uiManipulator.createTooltip('Turn this switch on to change the finish date.'));
        const toggle = this.uiManipulator.createToggle(this.settings.enableDateInput, () => this.toggleFinishDate(toggle));
        rightAlignedDiv.appendChild(toggle);
        div.appendChild(rightAlignedDiv);
        return div;
    }
    set DateInputsEnabled(enabled) {
        if (this.settings.enableDateInput === enabled) {
            return;
        }
        this.setDateInputsEnabledState(enabled);
    }
    setDateInputsEnabledState(enabled) {
        const dateInputs = this.getDateInputs();
        if (this.settings.lastDateUsed) {
            const date = new Date(this.settings.lastDateUsed);
            dateInputs[0].value = (date.getMonth() + 1).toString().padStart(2, '0');
            dateInputs[1].value = date.getDate().toString().padStart(2, '0');
            dateInputs[2].value = date.getFullYear().toString();
            // dispatch an event so vue can pick up the change
            const event = new Event("input", { bubbles: true });
            dateInputs.forEach(input => input.dispatchEvent(event));
        }
        else {
            this.saveLastDateUsed();
        }
        this.settings.enableDateInput = enabled;
        dateInputs.forEach(input => {
            if (enabled) {
                input.style.color = this.enabledInputColor;
                input.disabled = false;
            }
            else {
                input.style.color = this.disableInputColor;
                input.disabled = true;
            }
        });
        if (enabled) {
            dateInputs[0].focus();
            dateInputs[0].select();
        }
        else { // disabled
            const timeInput = this.getTimeInputs()[0];
            timeInput.focus();
            timeInput.select();
        }
    }
    get DateInputsEnabled() {
        return this.settings.enableDateInput;
    }
    getTimeInputs() {
        return this.document.querySelectorAll('.dateInput.flexGrowOne.flexNoWrap.smallerMarginTop:last-of-type input.required');
    }
    getDateInputs() {
        return this.document.querySelectorAll('.dateInput.flexGrowOne.flexNoWrap.smallerMarginTop:first-of-type input.required');
    }
    fixTimeInputs() {
        this.fixInputsToAutoAdvance(this.getTimeInputs());
    }
    fixDateInputs() {
        this.fixInputsToAutoAdvance(this.getDateInputs(), true);
    }
    fixInputsToAutoAdvance(inputs, isDate = false) {
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                const currentIndex = Array.from(inputs).indexOf(input);
                const nextInput = inputs[currentIndex + 1] || inputs[0];
                if (isDate && currentIndex === 2) {
                    if (input.value.length === 4) {
                        const timeInputs = this.getTimeInputs();
                        timeInputs[0].focus();
                        timeInputs[0].select();
                    }
                    return;
                }
                if (input.value.length === 2) {
                    nextInput.focus();
                    nextInput.select();
                }
            });
        });
    }
    watchForFinishTimeDivVisibleChanges(selector) {
        setInterval(() => {
            const element = this.document.querySelector(selector);
            const visible = !!element && element.style.display !== 'none';
            if (this.isFinishTimeInputVisible === visible) {
                return;
            }
            else {
                this.isFinishTimeInputVisible = visible;
                this.onFinishTimeDivVisibleChange(visible);
            }
        }, this.SEARCH_INTERVAL);
    }
    toggleFinishDate(toggle) {
        this.DateInputsEnabled = !this.settings.enableDateInput;
        this.uiManipulator.setToggleValue(this.settings.enableDateInput, toggle);
    }
    addInputEventHandlerOnDateToSaveDate() {
        const dateInputs = this.getDateInputs();
        dateInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.saveLastDateUsed();
            });
        });
    }
    getDateInputValue() {
        const dateInputs = this.getDateInputs();
        const month = parseInt(dateInputs[0].value);
        const day = parseInt(dateInputs[1].value);
        const year = parseInt(dateInputs[2].value);
        return new Date(year, month - 1, day);
    }
    saveLastDateUsed() {
        const newDate = this.getDateInputValue();
        if (newDate == this.settings.lastDateUsed) {
            return;
        }
        this.settings.lastDateUsed = newDate;
    }
}
// ScoringPanelSettings.ts
/*
the next steps:
- make UI element that will toggel the date input
- put appropriate classes on the date input for the setting
- have the date input set the lastDateUsed property.
*/
/// <reference path="SettingsBase.ts" />
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
        if (!this._lastDateUsed || isNaN(this._lastDateUsed.getTime())) {
            return null;
        }
        return new Date(this._lastDateUsed);
    }
    set lastDateUsed(value) {
        if (this._lastDateUsed == value) {
            return;
        }
        this._lastDateUsed = value;
        this.onChange();
    }
}
class UIManipulator {
    constructor(document) {
        this.document = document;
    }
    createDivWithClass(...className) {
        return this.addClassesToDiv(this.document.createElement('div'), ...className);
    }
    addClassesToDiv(div, ...className) {
        className.forEach((name) => {
            div.classList.add(name);
        });
        return div;
    }
    setToggleValue(newValue, toggle) {
        if (newValue) {
            toggle.classList.add('enabled');
        }
        else {
            toggle.classList.remove('enabled');
        }
    }
    createToggle(currentValue, callback) {
        const wrapperDiv = document.createElement('div');
        wrapperDiv.classList.add('toggleWrap', 'ease');
        wrapperDiv.style.marginTop = '0px';
        wrapperDiv.style.marginLeft = '-2px';
        wrapperDiv.style.marginRight = '3px';
        const toggleSlider = document.createElement('div');
        toggleSlider.classList.add('toggleSlider', 'ease');
        wrapperDiv.appendChild(toggleSlider);
        wrapperDiv.addEventListener('click', () => {
            callback();
        });
        this.setToggleValue(currentValue, wrapperDiv);
        return wrapperDiv;
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
// version.ts 
const versionDate = '240418';
const versionMinor = '5';
const fullVersion = `0.1.${versionDate}.${versionMinor}`;
// main_script.ts
/// <reference path="version.ts" />
(function () {
    console.log(`clubspot fix version ${fullVersion} by Charley Rathkopf`);
    // Function to apply the background color
    function applyBackgroundColor(row) {
        row.style.backgroundColor = 'mistyrose';
    }
    let elDocument = null;
    let spPage = null;
    let raceDetailsPage = null;
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
        raceDetailsPage = RaceDetailsPage.create(document);
        if (raceDetailsPage) {
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
    // note that this will not support concurancy. There should only be
    // one instance of a settings for any given key.
    getSettings() {
        const data = this.load();
        let settings = new this.settingsCtor();
        settings = Object.assign(settings, data);
        settings.onChange = () => {
            settings.lastSettingsChange = new Date();
            this.save(settings);
        };
        return settings;
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
        return result;
    }
}
