const _ = require("lodash");
const { CloudWatchLogsClient } = require("@aws-sdk/client-cloudwatch-logs");
const { getAllLogGroups, getAllLogStreams, getAllLogEvents } = require("./apis");
const getCredentials = require("aws-credentials-helper");
const { program } = require("commander");
const dayjs = require("dayjs");

const spawn = require("child_process").spawn;
function fzf(lists, previewData) {
  const entries = lists.join("\n");
  var fzf = spawn(
    `echo '${entries}' | fzf --sync --no-sort --preview "echo '${previewData}' | grep -B 1 -A 3 '{}'"`,
    {
      stdio: ["inherit", "pipe", "inherit"],
      shell: true,
    }
  );

  fzf.stdout.setEncoding("utf-8");

  return new Promise((resolve) => {
    fzf.stdout.on("readable", function () {
      var value = fzf.stdout.read();

      if (value !== null) {
        resolve(value.replace(/\s+/g, ""));
      }
    });
  });
}

const convertTime = (timestamp) =>
  dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss");

async function printLogEvent(logEvents) {
  const messages = logEvents
    .map((logEvent) => `${convertTime(logEvent.timestamp)} ${logEvent.message}`)
    .join("");
  console.log(messages);
}

function createFZFPreviewData(previewData, keys) {
  return JSON.stringify(
    previewData.map((v) => {
      const row = _.pick(v, keys);
      if (v.creationTime) {
        row.creationTime = convertTime(v.creationTime);
      }

      return row;
    }),
    null,
    2
  ).replace(/"/g, "");
}

async function main() {
  program.version("0.0.1");
  program
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

  const selectLogGroup = async () => {
    const logGroups = await getAllLogGroups(
      cloudWatchLogsPaginationConfiguration
    );
    const sortedLogGroups = _.orderBy(logGroups, ["creationTime"], ["desc"]); // _.sortBy(logGroups, ['logGroupName'])
    const pickedLogGroupNames = sortedLogGroups.map((v) => `${v.logGroupName}`);
    return fzf(
      pickedLogGroupNames,
      createFZFPreviewData(sortedLogGroups, ["logGroupName", "storedBytes"])
    );
  };
  const selectedLogGroup = await selectLogGroup();

  const selectLogStream = async (logGroupName) => {
    const logStreams = await getAllLogStreams(
      cloudWatchLogsPaginationConfiguration,
      logGroupName
    );
    const sortedLogStrems = logStreams.sort(
      (a, b) => b.creationTime - a.creationTime
    );
    const pickedLogStreamNames = sortedLogStrems.map((v) => v.logStreamName);
    return fzf(
      pickedLogStreamNames,
      createFZFPreviewData(sortedLogStrems, ["logStreamName", "storedBytes"])
    );
  };

  const selectedLogStream = await selectLogStream(selectedLogGroup);

  const logEvents = await getAllLogEvents(
    cloudWatchLogsPaginationConfiguration,
    selectedLogGroup,
    selectedLogStream
  );
  printLogEvent(logEvents);
  console.log(`node watch.js --profile vrdemo --group '${selectedLogGroup}' --stream '${selectedLogStream}'`);
}

main().catch(console.log);
