const _ = require("lodash");
const { CloudWatchLogsClient } = require("@aws-sdk/client-cloudwatch-logs");
const { getLogEvents } = require("./apis");
const getCredentials = require("aws-credentials-helper");
const { program } = require("commander");
const dayjs = require("dayjs");

const convertTime = (timestamp) =>
  dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss");

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
})

async function printLogEvent(logEvents) {
  const messages = logEvents
    .map((logEvent) => `${convertTime(logEvent.timestamp)} ${logEvent.message}`)
    .join("");
  console.log(messages);
}

async function main() {
  program.version("0.0.1");
  program
    .requiredOption("--group <logGroupName>", "CloudWatch LogGroupName")
    .requiredOption("--stream <logStreamName>", "CloudWatch LogStreamName")
    .option("--profile <profile>", "aws profile")
    .option("--region <region>", "aws region");

  program.parse(process.argv);

  const options = program.opts();
  const credentials = await getCredentials(options);

  const logsClient = new CloudWatchLogsClient({
    credentials,
  });

  const cloudWatchLogsPaginationConfiguration = {
    client: logsClient,
    pageSize: 50,
  };

  for await(const logEvents of getLogEvents(
    cloudWatchLogsPaginationConfiguration,
    options.group,
    options.stream
  )) {
    if (logEvents.length > 0) {
      printLogEvent(logEvents);
    }

    console.log('No newer events at this moment. Auto retry..');
    await sleep(10000);
  }
}

main().catch(console.log);
