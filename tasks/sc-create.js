'use strict';

var _ = require('lodash');
var sync = require('synchronize');
var path = require('path');
var elasticsearch = require('elasticsearch');

module.exports = function (grunt) {

    grunt.registerMultiTask('sc-create', 'Initialize ElasticSearch source control index', function () {

        var sourceControlIndex = 'sc',
            sourceControlType = 'changelogs',
            options = this.options() || {},
            done = this.async(),
            es = new elasticsearch.Client({ host: options.host });

        sync(es.indices, 'exists', 'create', 'close', 'open', 'putMapping');

        sync.fiber(function (){
            grunt.log.writeln('Initializing ES Source Control');

            try{
                //Close all indexes
                es.indices.close({ index: '_all' });

                if( !es.indices.exists({ index: sourceControlIndex }) ){
                    grunt.log.writeln('\nCreating main index: ' + sourceControlIndex);

                    es.indices.create({
                        index: sourceControlIndex
                    });

                    grunt.log.ok(('Main Index created successfully'));

                    if ( !es.indices.exists({ index: sourceControlType }) ){
                        grunt.log.writeln('\nCreating main type: ' + sourceControlType);

                        var typeBody = {};

                        typeBody[sourceControlType] = {
                            "_all": { "enabled": false },
                            "dynamic": false,
                            "properties": {
                                "id_runned": { "type": "string", "index": "not_analyzed" },
                                "success": { "type":"boolean" },
                                "run_date": { "type": "date" }
                            }
                        }

                        es.indices.putMapping({
                            "index": sourceControlIndex,
                            "type": sourceControlType,
                            "ignoreConflicts": true,
                            "body": typeBody
                        });

                        grunt.log.ok('The Main type was created successfully');
                    }
                }else{
                    grunt.log.ok(('Index already created'));
                }

                //Open all indexes
                es.indices.open({ index: '_all' });
            }catch (e){
                grunt.log.error(e.message);
                es.indices.open({ index: '_all' });
                done(false);
            }

            done();
        });
    });
};