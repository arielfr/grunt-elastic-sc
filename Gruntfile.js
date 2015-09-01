'use strict';

module.exports = function (grunt) {
    grunt.initConfig({
        'sc-create': {
            main: {
                options: {
                    host: 'localhost:9200'
                }
            }
        },

        'sc-process': {
            main: {
                options: {
                    host: 'localhost:9200'
                }
            }
        }
    });

    grunt.loadTasks('tasks');

    //Not working yet
    grunt.registerTask('sc-update', ['sc-create', 'sc-process']);
};