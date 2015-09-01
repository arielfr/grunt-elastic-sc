# Grunt ElasticSearch Source Control

This is a Grunt set of tasks for source control your ElasticSearch. I know it's not quite necessary to have a source control on your ES installation. But, when you work with pairs, it's not confortable when all of you need to update the your mappings or add custom data to your types.

Whit this Tasks, you will be able to create a Master Changelog when you references your Changelogs. In this changelogs you can Create Mappings, Add Data and Delete Data having full control.

If you make a change and push your changes, then your partner can pull and update his ES with a simple grunt command.

## Add to package.json

Your need to add to your dependencies

```
"dependencies": {
	"grunt-elastic-sc": "X.X.X"
}
```

## Usage - Tasks

You have two main tasks

- sc-create
- sc-process

You must create this directory structure on your project.

-> es-source-control
	-> changelogs
	-> sc-master.json

## sc-master.json - Master Changelog File

This will be the master changelog file. This file is going to have the changelogs references to execute.

```
{
	"changelogs": [
		{
			"id": "create-testing",
			"folder": "testing",
			"file": "mapping",
			"type": "mapping"
		},
		{
			"id": "add-data",
			"folder": "testing",
			"file": "data",
			"type": "data"
		},
		{
			"id": "deleting-data",
			"folder": "testing",
			"file": "delete",
			"type": "delete"
		},
		{
		...
		}
	]
}

The **id** must be unique.
```

All the changelogs are going to be find on the folder "changelogs" on your "es-source-control" root directory.

### sc-create - Create Index for Source Control

This task will create an index called "sc". With this index, a type called "changelogs" also be created. This type is going to contain the ids already executed. This will keep the control of the code already executed.

The next are the properties of "changelogs"

```
"properties": {
    "id_runned": { "type": "string", "index": "not_analyzed" },
    "success": { "type":"boolean" },
    "run_date": { "type": "date" }
}
```

### sc-process - Execute the changelogs

This task will execute all the changelog that aren't yet executed

Parameters:

- from: This parameter should be populated with the id of the changelog from when we want to start executed the changes (not included).

Example:
```
grunt sc-process --from:add-data
```

Follow this example, this command will only execute "deleting-data".

**This command should be used when you update your ES from a Snapshot, and you don't want to execute the previous changes again (Assuming your "es" Index is empty or outdated). If you are going to use this option all the time, add it to your Gruntfile configurations.**

#### Add Data

To add data, the JSON file should be like this:

```
{
	"changes": [
		{
			"index": "sc",
			"type": "test_mapping",
			"records": [
				{
					"id": 1,
					"text": "This is a text message 1"
				},
				{
					"id": 2,
					"text": "This is a text message 2"
				},
				{
				...
				}
			]
		}
	]
}
```

- Index & Type would be the ones you are wanting to add the data.
- The records are going to be the "body" tag to send to ElasticSearch. This is an array, so you can send 1 or more.

#### Add Type - Mapping

To add a type, the JSON file should be like this:

```
{
	"changes": [
		{
			"index": "sc",
			"type": "test_mapping",
			"body": {
				"test_mapping": {
					"_all": { "enabled": false },
					"dynamic": false,
					"_id": {
						"path": "id"
				    },
				    "properties": {
				    	"id": { "type": "integer" },
				    	"text": { "type": "string", "index": "not_analyzed" }
				    }
				}
			}
		}
	]
}
```

- The Index would be the index to add the type.
- The type is going to be the type to add
- The body should be the body to be sended to ElasticSearch

#### Delete by Query

To make a delete by query, the JSON file should be like this:

```
{
	"changes": [
		{
			"index": "sc",
			"type": "test_mapping",
			"records": [
				{
					"query": {
						"term": {
							"id": 3
						}
					}
				}
			]
		}
	]
}
```

- The Index and Type would be the ones to perform the delete.
- The records are going to contain the query tag to execute. In this case, we are going to delete all the elements that have the id = 3

## Collaboration

This is a base for creating a better Souce Control for ElasticSearch, all Forks and PR would be accepted. Thanks!

## License
```
The MIT License (MIT)

Copyright (c) <2015> <Ariel Rey>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
