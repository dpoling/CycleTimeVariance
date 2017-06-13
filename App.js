//Cycle Time Variance grid

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {
        Ext.create('Rally.data.wsapi.Store', {
            model: 'userstory',
            autoLoad: true,
            filters: [{
                property: 'ScheduleState',
                operator: '>',
                value: 'Completed'
            }],
            limit: 'Infinity',
            listeners: {
                load: this._onDataLoaded,
                scope: this
            },
            fetch: ['FormattedID', 'Name', 'ScheduleState', 'PlanEstimate', 'InProgressDate', 'AcceptedDate']
        });
    },

    getFilters: function(){
      return Rally.data.wsapi.Filter.fromQueryString("(ScheduleState > 'Completed')");  
    },
    
    _onDataLoaded: function(store, data) {
        var records = _.map(data, function(record) {
            //Perform custom actions with the data here
            //Calculations, etc.
            var d1 = Rally.util.DateTime.fromIsoString(record.get('InProgressDate'));
            var d2 = Rally.util.DateTime.fromIsoString(record.get('AcceptedDate'));
            var days = Rally.util.DateTime.getDifference(d2,d1,'day');
//            console.log('d1= ',d1);
//            console.log('d2= ',d2);
//            console.log('days= ',days);
            return Ext.apply({
                daysCount: days
            }, record.getData());
        });
        console.log('records= ',records);

        this.add({
            xtype: 'rallygrid',
            showPagingToolbar: true,
            showRowActionsColumn: false,
            editable: false,
            store: Ext.create('Rally.data.custom.Store', {
                data: records
            }),
            columnCfgs: [
                {
                    xtype: 'templatecolumn',
                    text: 'ID',
                    dataIndex: 'FormattedID',
                    width: 70,
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                },
                {
                    text: 'Name',
                    dataIndex: 'Name',
                    flex: 2
                },
//                {
//                    text: 'Schedule State',
//                    dataIndex: 'ScheduleState',
//                    width: 70
//                },
                {
                    text: 'In-Progress Date',
                    dataIndex: 'InProgressDate',
                    flex: 1,
                    renderer: function(value){
                        if (value){
                            var date = Rally.util.DateTime.fromIsoString(value);
                            return Rally.util.DateTime.format(date, 'M d Y : h:i:s');
                        }
                        return '-- No InProgress Date --';
                    }
                },
                {
                    text: 'Accepted Date',
                    dataIndex: 'AcceptedDate',
                    flex: 1,
                    renderer: function(value){
                        if (value){
                            var date = Rally.util.DateTime.fromIsoString(value);
                            return Rally.util.DateTime.format(date, 'M d Y : h:i:s');
                        }
                        return '-- No Accepted Date --';
                    }
                },
                {
                    text: 'Plan Est',
                    dataIndex: 'PlanEstimate',
                    width: 35
                },
                {
                    text: 'Days',
                    dataIndex: 'daysCount',
                    width: 50,
                    renderer: function(v,m,r){
                        var p = r.get("PlanEstimate");
                        console.log("V is ", v);
                        console.log ("PlanEstimate is ", p);
                        if (v > p){
                            return "<font color='red' font-weight='bold' background-color='lightgray'>" + v + "</font>";
                        }
                        else {
                            return "<font color='green' font-weight='bold' background-color='lightgray'>" + v + "</font>";
                        }
                    }
                }
            ]
        });
    }
});