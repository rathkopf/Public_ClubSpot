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
    }
    ModifyFinishWindow() {
        this.DisableDateInputs();
        this.FixTimeInputs();
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
}
// ScoringPanelSettings.ts
class SettingsBase {
    constructor() {
        this.Key = "";
    }
}
class ScoringPanelSettings {
    constructor() {
        this.enableDateInput = false;
        this.lastDateUsed = new Date();
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
    // constructor(localStorageKey: string) {
    //     this.localStorageKey = localStorageKey;
    // }
    // Copiolot search term "if i have a generic T in typescript, can I find what type T represents?"
    constructor(TCtor) {
        const typeName = TCtor.name;
        const currentUrl = window.location.href;
        const regex = /\/([^\/]+)\/?$/; // Regular expression to match the last part of the URL
        const match = currentUrl.match(regex);
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
        if (data) {
            return JSON.parse(data);
        }
        return null;
    }
}
