var _       = require('lodash');
var async   = require('async');
var cheerio = require('cheerio');
var exec    = require('child_process').exec;
var fs      = require('fs');
var mkdirp  = require('mkdirp');
var request = require('request');

var host = 'http://mathsoc.uwaterloo.ca';
var cookie = process.env['MATHSOC_COOKIE'];

var courseCodes = [
  'ACTSC',
  'AFM',
  'AMATH',
  'BIOL',
  'CHEM',
  'CM',
  'CO',
  'CS',
  'ECE',
  'ECON',
  'HRM',
  'MATH',
  'MSCI',
  'PHYS',
  'PMATH',
  'SCI',
  'SE',
  'STAT'
];

function downloadFile(url, ofile, cb) {
  console.log('downloadFile: ', url, 'ofile: ', ofile);
  var cmd = `curl '${url}' -H 'Pragma: no-cache' -H 'DNT: 1' -H 'Accept-Encoding: gzip, deflate, sdch' -H 'Accept-Language: en-US,en;q=0.8,zh-CN;q=0.6,zh;q=0.4,zh-TW;q=0.2' -H 'Upgrade-Insecure-Requests: 1' -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.110 Safari/537.36' -H 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8' -H 'Cache-Control: no-cache' -H 'Referer: http://mathsoc.uwaterloo.ca/ExamBank' -H 'Cookie: `${cookie}`' -H 'Connection: keep-alive' --compressed -o ${ofile}`;
  console.log(cmd);
  exec(cmd, cb);
}

function getUrl(url, cb) {
  var opts = {
    url: url,
    headers: {
      Cookie: cookie,
      Referer: 'http://mathsoc.uwaterloo.ca/ExamBank'
    }
  };
  request(opts, cb);
}

function downloadExams(courseCode, cb) {
  getUrl(`${host}/exambank/courses/${courseCode}`, function (err, res, body) {
    var courseNumbers = eval(body).slice(0, 1);
    async.eachSeries(courseNumbers, function (courseNumber, courseNumberCB) {
      getUrl(`${host}/exambank/exams/${courseCode}/${courseNumber}`, function (err, res, body) {
        if (err) return courseNumberCB();
        $ = cheerio.load(body);
        var links = $('a');
        var urls = [];
        _.each(links, function (link) {
          urls.push(link.attribs.href);
        });
        var outputDir = `exams/${courseCode}/${courseNumber}`
        mkdirp(outputDir);
        async.eachSeries(urls, function (url, urlCB) {
          var outputFile = url.split('/').slice(5, 7).join('_') + '.pdf';
          downloadFile(`${host}${url}`, `${outputDir}/${outputFile}`, function () {
            urlCB();
          });
        }, function () {
          courseNumberCB();
        });
      });
    }, function () {
      cb();
    });
  });
}

async.eachSeries(courseCodes, downloadExams, function () {
  console.log('DONE');
});
