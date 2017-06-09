//Cycle Time Variance grid

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',

    launch: function() {
        Ext.create('Rally.data.wsapi.Store', {
            model: 'userstory',
            autoLoad: true,
            listeners: {
                load: this._onDataLoaded,
                scope: this
            },
            fetch: ['FormattedID', 'Name', 'ScheduleState', 'Tasks', 'Defects']
        });
    },

    _onDataLoaded: function(store, data) {
        var records = _.map(data, function(record) {
            //Perform custom actions with the data here
            //Calculations, etc.
            return Ext.apply({
                TaskCount: record.get('Tasks').Count
            }, record.getData());
        });

        this.add({
            xtype: 'rallygrid',
            showPagingToolbar: false,
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
                    width: 100,
                    tpl: Ext.create('Rally.ui.renderer.template.FormattedIDTemplate')
                },
                {
                    text: 'Name',
                    dataIndex: 'Name',
                    flex: 1
                },
                {
                    text: 'Schedule State',
                    dataIndex: 'ScheduleState'
                },
                {
                    text: '# of Tasks',
                    dataIndex: 'TaskCount'
                },
                {
                    text: '# of Defects',
                    dataIndex: 'Defects',
                    renderer: function(value) {
                        return value.Count;
                    }
                }
            ]
        });
    }
});