var page = new WebPage();
var system = require('system');
var allTestsURL = "http://localhost:4020/dg/en/current/tests.html";
var i, j;
var x=0, y=0;
//var failureCount;
//var failures;
var failedItem;
//var failureMessage = [];
var reportingDone = false;
var specDescription;
var pass = false;
var element;


page.open(allTestsURL, function (status) {
    console.log(allTestsURL + " Status:" + status);
    if (status !== 'success') {
        console.log('Unable to access '+ allTestsURL + '. Are you running sc-server?');
        phantom.exit(1);
    }


    window.setInterval(function() {
        var str = "";
        y++;
        var st = page.evaluate(function () {
            str = "";
            if(document.body.querySelector("span.status span.passed")){
                str += "passed: true";
                console.log("str: " + str);
            }
            if (document.body.querySelector("span.status span.failed")) {
                str += "; failed: true";
                console.log("str: " + str);
            }
            console.log("returning " + str);
            return str;
        });

        var failureCount = page.evaluate(function () {
            var failureList = document.body.querySelectorAll('tr.dirty');
            return failureList.length;
        });



        console.log("status returned is " + st);
        if (st == "passed: true") {
            console.log("All tests passed! ");
            pass = true;
            phantom.exit(0);
        } else if(st.indexOf("failed") > 0){
            console.log("Tests have failed.");
            console.log("Number of failures = " + failureCount);

            for (i = 1; i < failureCount+1; i++) {
                var failureDesc = page.evaluate(function () {
                    var failureMessage =[];
                    var elementList = document.body.querySelectorAll('tr.dirty');
                    for (j = 0; j < elementList.length; j++) {
                        var currentElement = elementList[j];
                        var string = currentElement.querySelector("td.desc").innerText;
                        failureMessage[j] = string;
                    }
                    return failureMessage;
                });
            }
            for (x=1; x<failureDesc.length+1; x++){
                console.log("Failure #" + x + " " + failureDesc[x-1]);
            }



            phantom.exit(1);
        }
        if(y > 1) {
            console.log("exiting with error as not yet resolved");
            phantom.exit(1);
        }
    }, 5000);
});
