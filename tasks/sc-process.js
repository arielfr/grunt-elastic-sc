'use strict';

var _ = require('lodash');
var sync = require('synchronize');
var path = require('path');
var elasticsearch = require('elasticsearch');

module.exports = function (grunt) {

    grunt.registerMultiTask('sc-process', 'Initialize or update ElasticSearch base', function () {

        var sourceControlIndex = 'sc',
            sourceControlType = 'changelogs',
            routeFolder = 'es-source-control',
            changelogFolder = 'changelogs',
            options = this.options() || {},
            from = grunt.option('from') || options.from || null,
            done = this.async(),
            es = new elasticsearch.Client({ host: options.host });

        sync(es.indices, 'exists', 'create', 'close', 'open', 'putMapping');
        sync(es, 'search', 'index', 'bulk', 'deleteByQuery');

        sync.fiber(function (){
            grunt.log.writeln('Starting update process');

            try{
                var masterChangeLog = grunt.file.readJSON(routeFolder + '/sc-master.json');
                var changelogsToExecute = masterChangeLog.changelogs;

                grunt.log.writeln('\n' + changelogsToExecute.length + ' changelog/s found\n');

                if( changelogsToExecute.length > 0 && from ){
                    grunt.log.writeln('Executing from ' + from + '\n');

                    changelogsToExecute = _.drop(changelogsToExecute, _.findIndex(changelogsToExecute, 'id', from) + 1);
                }

                _(changelogsToExecute).forEach(function(changelog){
                    var q = {
                        "index": 'sc',
                        "type": 'changelogs',
                        "body": {
                            "query": {
                                "term": {
                                    "id_runned": {
                                        "value": changelog.id
                                    }
                                }
                            }
                        }
                    };

                    var result = es.search(q);
                    var result = {hits: {total: 1}};

                    //Execute the changelog
                    if(result.hits.total == 0){
                        grunt.log.writeln('\nId: ' + changelog.id + ' - Processing...');

                        var changeJson = grunt.file.readJSON(routeFolder + '/' + changelogFolder + '/' + changelog.folder + '/' + changelog.file + '.json');

                        try{
                            _(changeJson.changes).forEach(function(change, index){
                            
                                if(changelog.type == 'data'){
                                    _(change.records).forEach(function(record){
                                        var q = {
                                            "index": change.index,
                                            "type": change.type,
                                            "id": record.id,
                                            "body": record
                                        };

                                        es.index(q);
                                    }).value();
                                }else if(changelog.type == 'mapping'){
                                    var q = {
                                        "index": change.index,
                                        "type": change.type,
                                        "ignoreConflicts": true,
                                        "body": change.body
                                    }

                                    es.indices.putMapping(q);
                                }else if(changelog.type == 'delete'){
                                    _(change.records).forEach(function(record){
                                        var q = {
                                            "index": change.index,
                                            "type": change.type,
                                            "body": record //Should be a query
                                        };

                                        es.deleteByQuery(q);
                                    }).value();
                                }
                            }).value();

                            var q = {
                                "index": sourceControlIndex,
                                "type": sourceControlType,
                                "body": {
                                    "id_runned": changelog.id,
                                    "success": true,
                                    "run_date": new Date()
                                }
                            };

                            es.index(q);

                            grunt.log.ok('Id: ' + changelog.id + ' - Successful');
                        }catch(e){
                            var q = {
                                "index": sourceControlIndex,
                                "type": sourceControlType,
                                "body": {
                                    "id_runned": changelog.id,
                                    "success": false,
                                    "run_date": new Date()
                                }
                            };

                            es.index(q);

                            grunt.log.error(e.message);
                        }
                    }else{
                        grunt.log.ok('Id: ' + changelog.id + ' - Already Runned');
                    }
                }).value();
            }catch (e){
                grunt.log.error(e.message);
                done(false);
            }

            done();
        });
    });
};