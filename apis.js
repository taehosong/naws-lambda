const {
  paginateDescribeLogStreams,
  paginateDescribeLogGroups,
  paginateGetLogEvents,
} = require("@aws-sdk/client-cloudwatch-logs");

async function getAllLogGroups(cloudWatchLogsPaginationConfiguration) {
  const paginator = paginateDescribeLogGroups(
    cloudWatchLogsPaginationConfiguration,
    { logGroupNamePrefix: "/aws/lambda" }
  );

  const logGroups = [];
  for await (const page of paginator) {
    logGroups.push(...page.logGroups);
  }

  return logGroups;
}

async function getAllLogStreams(
  cloudWatchLogsPaginationConfiguration,
  logGroupName
) {
  const paginator = paginateDescribeLogStreams(
    cloudWatchLogsPaginationConfiguration,
    {
      logGroupName,
    }
  );

  const logStreams = [];
  for await (const page of paginator) {
    logStreams.push(...page.logStreams);
  }

  return logStreams;
}

async function getAllLogEvents(
  cloudWatchLogsPaginationConfiguration,
  logGroupName,
  logStreamName
) {
  const paginator = paginateGetLogEvents(
    cloudWatchLogsPaginationConfiguration,
    {
      logGroupName,
      logStreamName,
    }
  );

  const logEvents = [];
  for await (const page of paginator) {
    if (page.events.length === 0) {
      return logEvents;
    }
    logEvents.push(...page.events);
  }

  return logEvents;
}

async function* getLogEvents(
  cloudWatchLogsPaginationConfiguration,
  logGroupName,
  logStreamName
) {
  const paginator = paginateGetLogEvents(
    cloudWatchLogsPaginationConfiguration,
    {
      logGroupName,
      logStreamName,
    }
  );

  const logEvents = [];
  for await (const page of paginator) {
    yield page.events;
  }

  return logEvents;
}


module.exports = {
  getAllLogGroups,
  getAllLogStreams,
  getAllLogEvents,
  getLogEvents
};