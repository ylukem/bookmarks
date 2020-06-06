const axios = require("axios");
const moment = require("moment");
const qs = require("qs");
const { DROPBOX, PINBOARD } = process.env;

const pinboardOptions = qs.stringify({
  auth_token: PINBOARD,
  tag: "publish",
  format: "json",
});

const getBookmarks = async () => {
  const req = await axios({
    url: `https://api.pinboard.in/v1/posts/all?${pinboardOptions}`,
  });
  return req.data;
};

const generateTS = (time) => moment(time).format("MMMM YYYY");

const generateBookmark = ({ href, description, time }, index) => {
  let bookmark = "";

  const ts = generateTS(time);
  let previousTS = null;
  const previous = bookmarks[index - 1];
  if (typeof previous != "undefined") {
    previousTS = generateTS(previous.time);
  }

  if (ts != previousTS) {
    bookmark += `<span class="bookmark-month">${ts}</span>`;
    bookmark += "\n\n";
  }

  const host = new URL(href).hostname.replace("www.", "");
  bookmark += `[${description}](${href}) <span class="hostname">${host}</span>`;
  return bookmark;
};

const generateMarkdown = (bookmarks) =>
  `
Title: bookmarks
Page: Yes
Permalink: /bookmarks

This page is an ocassionally updated collection of my personal bookmarks.

${bookmarks.map(generateBookmark).join("\n\n")}
    `.trim();

let bookmarks = null;

const uploadToDropbox = (markdown) => {
  return axios({
    url: "https://content.dropboxapi.com/2/files/upload",
    method: "POST",
    headers: {
      Authorization: `Bearer ${DROPBOX}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path: "/ylukem/pages/bookmarks.md",
        mode: "overwrite",
        mute: true,
      }),
    },
    data: Buffer.from(markdown),
  });
};

const main = async () => {
  bookmarks = await getBookmarks();
  console.log("Fetched bookmarks from pinboard");
  const markdown = generateMarkdown(bookmarks);
  await uploadToDropbox(markdown);
  console.log("Bookmarks updated");
  process.exit(0);
};

main();