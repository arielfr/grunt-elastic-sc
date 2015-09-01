'use strict';

var _ = require('lodash');
var sync = require('synchronize');
var path = require('path');
var elasticsearch = require('elasticsearch');

module.exports = function (grunt) {

    grunt.registerMultiTask('sc-process', 'Initialize or update ElasticSearch base', function () {

        var sourceControlIndex = 'sc',
            sourceControlType = 'changelogs',
            changelogFolder = 'sc-changelogs',
            options = this.options() || {},
            done = this.async(),
            es = new elasticsearch.Client({ host: options.host });

        sync(es.indices, 'exists', 'create', 'close', 'open', 'putMapping');
        sync(es, 'search', 'index', 'bulk', 'deleteByQuery');

        sync.fiber(function (){
            grunt.log.writeln('Starting update process');

            try{
                var masterChangeLog = grunt.file.readJSON('sc-master.json');

                grunt.log.writeln('\n' + masterChangeLog.changelogs.length + ' changelog/s found\n');

                _(masterChangeLog.changelogs).forEach(function(changelog){
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

                    //Execute the changelog
                    if(result.hits.total == 0){
                        grunt.log.writeln('\nId: ' + changelog.id + ' - Processing...');

                        var changeJson = grunt.file.readJSON(changelogFolder + '/' + changelog.folder + '/' + changelog.file + '.json');

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
                                    es.indices.putMapping({
                                        "index": change.index,
                                        "type": change.type,
                                        "ignoreConflicts": true,
                                        "body": change.body
                                    });
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