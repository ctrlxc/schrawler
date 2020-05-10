var AWS = require("aws-sdk");

AWS.config.update({
  region: 'ap-northeast-1',
  endpoint: 'http://dynamodb:8000',
});

var dynamodb = new AWS.DynamoDB();

var tables = [
  {
    TableName : "followers",
    KeySchema: [
      { AttributeName: 'pk', KeyType: "HASH"},
      { AttributeName: 'sk', KeyType: "RANGE"},
    ],
    AttributeDefinitions: [       
      { AttributeName: "pk", AttributeType: "S" },
      { AttributeName: "sk", AttributeType: "S" },
    ],
    ProvisionedThroughput: {       
        ReadCapacityUnits: 5, 
        WriteCapacityUnits: 5
    }
  },
];

tables.map(v => dynamodb.createTable(v, function(err, data) {
  if (err) {
      console.error("Unable to create table. Error JSON:", JSON.stringify(err, null, 2));
  } else {
      console.log("Created table. Table description JSON:", JSON.stringify(data, null, 2));
  }
}));
