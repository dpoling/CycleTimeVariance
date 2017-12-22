//Cycle Time Variance grid

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    launch: function () {
        this._createStore();
    },
    onTimeboxScopeChange: function (timeboxScope) {
        this.getContext().setTimeboxScope(timeboxScope);
        this._removeGrid();
        this._createStore();
    },
    _createStore: function () {
        Ext.create('Rally.data.wsapi.Store', {
            model: 'userstory',
            autoLoad: true,
            filters: this._getFilters(),
            limit: 'Infinity',
            listeners: {
                load: this._onDataLoaded,
                scope: this
            },
            fetch: ['FormattedID', 'Name', 'ScheduleState', 'Project', 'PlanEstimate', 'InProgressDate', 'AcceptedDate']
        });
    },
    _onDataLoaded: function (store, data) {
        var records = Ext.Array.map(data, function (record) {
            var d1 = Rally.util.DateTime.fromIsoString(record.get('InProgressDate'));
            var d2 = Rally.util.DateTime.fromIsoString(record.get('AcceptedDate'));
            var days = this._calcDays(d1, d2);
            return Ext.apply({
                daysCount: days
            }, record.getData());
        }, this);
        this._addGrid(records);
    },
    _getFilters: function () {
        var tbScope = this.getContext().getTimeboxScope();
        var qFilter = "(ScheduleState > Completed)";
        if (tbScope) {
            var tbFilter = tbScope.getQueryFilter();
            if (qFilter && qFilter.length > 0) {
                return tbFilter.and(Rally.data.wsapi.Filter.fromQueryString(qFilter));
            } else {
                return tbFilter;
            }
        } else {
            if (qFilter && qFilter.length > 0) {
                return Rally.data.wsapi.Filter.fromQueryString(qFilter);
            } else {
                return [];
            }
        }
    },
    _calcDays: function (d1, d2) {
        d1 = Rally.util.DateTime.convertForEditing(d1); // This puts the date into the workspace time zone (Eastern Time)
        d2 = Rally.util.DateTime.convertForEditing(d2);
        if (d1.getDay() === 0) {
            d1 = Rally.util.DateTime.add(d1, "day", -2); //Disregard Sunday
            d1.setHours(18); //Set time to COB Friday 6:00pm
            d1.setMinutes(0);
        }
        if (d1.getDay() === 6) {
            d1 = Rally.util.DateTime.add(d1, "day", -1); //Disregard Saturday
            d1.setHours(18); //Set time to COB Friday 6:00pm
            d1.setMinutes(0);
        }
        if (d2.getDay() === 0) {
            d2 = Rally.util.DateTime.add(d2, "day", -2); //Sunday counts as Friday COB for end date
            d2.setHours(18); //Set time to COB Friday 6:00pm
            d2.setMinutes(0);
        }
        if (d2.getDay() === 6) {
            d2 = Rally.util.DateTime.add(d2, "day", -1); //Saturday counts as Friday COB for end date
            d2.setHours(18); //Set time to COB Friday 6:00pm
            d2.setMinutes(0);
        }
        if (d1.getHours() < 8) {
            d1.setHours(8); // if it was started before 8am then it started at 8am.
            d1.setMinutes(0);
        }
        if (d2.getHours() > 18) {
            d2.setHours(18);
            d2.setMinutes(0);
        }
        var days = this._getDifference(d2, d1);
        return days;
    },
    _getDifference: function (d2, d1) {
        var value = 0.0;
        var h1 = d1.getHours();
        var m1 = d1.getMinutes();
        var h2 = d2.getHours();
        var m2 = d2.getMinutes();
        value += this._getStartFractionOrFull(h1, m1);
        value += this._getLastFractionOrFull(h2, m2);
        var sd = Rally.util.DateTime.add(d1, "day", 1); //start day already done
        sd.setHours(8);
        sd.setMinutes(0);
        var ld = Rally.util.DateTime.add(d2, "day", -1); // last day already done
        ld.setHours(18);
        ld.setMinutes(0);
        while (sd <= ld) {
            if (sd.getDay() !== 0 && sd.getDay() !== 6 && !this._isHoliday(sd)) {
                value += 1;
            }
            sd = Rally.util.DateTime.add(sd, "day", 1);
        }
        return value;
    },
    _getStartFractionOrFull: function (hours, minutes) {
        // Saturday and Sunday start days should be adjusted prior to calling
        // this routine.  This routine only works with hours and minutes.
        var value = 0.0;
        if (hours < 10 || (hours === 10 && minutes <= 14))
            value = 1;
        else if (hours < 11 || (hours === 11 && minutes <= 44))
            value = 0.75;
        else if (hours < 13 || (hours === 13 && minutes <= 44))
            value = 0.5;
        else if (hours < 16 || (hours === 16 && minutes <= 44))
            value = 0.25;
        return value;
    },
    _getLastFractionOrFull: function (hours, minutes) {
        // Saturday and Sunday start days should be adjusted prior to calling
        // this routine.  This routine only works with hours and minutes.
        var value = 0.0;
        if (hours < 10 || (hours === 10 && minutes <= 14))
            value = 0.0;
        else if (hours < 11 || (hours === 11 && minutes <= 59))
            value = 0.25;
        else if (hours < 13 || (hours === 13 && minutes <= 44))
            value = 0.5;
        else if (hours < 16 || (hours === 16 && minutes <= 44))
            value = 0.75;
        else
            value = 1.0;
        return value;
    },
    _isHoliday: function (d) {
        var result = false;
        var yr = d.getFullYear();
        var goodFriday = this._getEaster(yr);
        goodFriday = Rally.util.DateTime.add(goodFriday, "day", -2);
        var labourDay = this._getFirstMonday(9, yr);
        // Remember, the stupid javascript getMonth() function uses 0 based month numbers - gag me with a spoon.
        if (d.getMonth() === 0 && d.getDate() === 1) { // New Years Day
            result = true;
        } else if ((d.getMonth() === goodFriday.getMonth()) && (d.getDate() === goodFriday.getDate())) { // Good Friday
            result = true;
        } else if (d.getMonth() === 6 && d.getDate() === 1) { // Canada Day
            result = true;
        } else if ((d.getMonth() === labourDay.getMonth()) && (d.getDate() === labourDay.getDate())) { // Labour day
            result = true;
        } else if (d.getMonth() === 11 && d.getDate() === 25) { // Christmas Day
            result = true;
        }
        return result;
    },
    _getEaster: function (y) {
        var date, a, b, c, m, d;
        date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setFullYear(y);
        a = y % 19;
        b = (2200 <= y && y <= 2299) ?
                ((11 * a) + 4) % 30 :
                ((11 * a) + 5) % 30;
        c = ((b === 0) || (b === 1 && a > 10)) ?
                (b + 1) :
                b;
        m = (1 <= c && c <= 19) ? 3 : 2;
        d = (50 - c) % 31;
        date.setMonth(m, d);
        date.setMonth(m, d + (7 - date.getDay()));
        return date;
    },
    _getFirstMonday: function (month, year) {
        var d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setFullYear(year);
        d.setMonth(month - 1); // stupid javascript function uses 0 based month numbers - gag me with a spoon.
        d.setDate(1);
        var day = 0;
        if (d.getDay() === 0) { // check if first of the month is a Sunday, if so set date to the second
            day = 2;
            d = d.setDate(day);
            d = new Date(d);
        }
        // check if first of the month is a Monday, if so return the date, otherwise
        //  get to the Monday following the first of the month
        else if (d.getDay() !== 1) {
            day = 9 - (d.getDay());
            d = d.setDate(day);
            d = new Date(d);
        }
        return d;
    },
    _addGrid: function (records) {
        this.add({
            xtype: 'rallygrid',
            showPagingToolbar: true,
            showRowActionsColumn: false,
            editable: false,
            features: [{
                    ftype: 'groupingsummary',
                    groupHeaderTpl: '{name} ({rows.length})'
                }],
            store: Ext.create('Rally.data.custom.Store', {
                groupField: 'Project',
                groupDir: 'ASC',
                getGroupString: function (record) {
                    var proj = record.get('Project');
                    return (proj && proj._refObjectName) || 'None';
                },
                data: records
            }),
            columnCfgs: [
                {
                    xtype: 'templatecolumn',
                    text: 'ID',
                    dataIndex: 'FormattedID',
                    width: 75,
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                },
                {
                    text: 'Name',
                    dataIndex: 'Name',
                    flex: 1
                },
                {
                    text: 'In-Progress Date',
                    dataIndex: 'InProgressDate',
                    flex: 1,
                    renderer: function (value) {
                        if (value) {
                            var date = Rally.util.DateTime.fromIsoString(value);
                            return Rally.util.DateTime.format(date, 'D M d Y : h:i:s a');
                        }
                        return '-- No InProgress Date --';
                    }
                },
                {
                    text: 'Accepted Date',
                    dataIndex: 'AcceptedDate',
                    flex: 1,
                    renderer: function (value) {
                        if (value) {
                            var date = Rally.util.DateTime.fromIsoString(value);
                            return Rally.util.DateTime.format(date, 'D M d Y : h:i:s a');
                        }
                        return '-- No Accepted Date --';
                    }
                },
                {
                    text: 'Plan Est',
                    dataIndex: 'PlanEstimate',
                    width: 40
                },
                {
                    text: 'Days',
                    dataIndex: 'daysCount',
                    width: 60,
                    renderer: function (v, m, r) {
                        var p = r.get("PlanEstimate");
                        if (v > p) {
                            return "<font color='red' font-weight='bold' background-color='lightgray'>" + v + "</font>";
                        } else {
                            return "<font color='green' font-weight='bold' background-color='lightgray'>" + v + "</font>";
                        }
                    }
                }
            ]
        });
    },
    _removeGrid: function () {
        var grid = this.down('rallygrid');
        if (grid) {
            this.remove(grid);
        }

    }
});