function checkTaint() {
  var lineNum = arguments[0];
  var result = 0;
  for (var i = 1; i < arguments.length; i++) {
    result |= arguments[i];
  }

  if (result === 1) {
    console.log("CORDY WARNING: Line " + lineNum + " of the original JS file might be tainted.");
  }
}
var taint = {};
taint.fn = {};
/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
   // Application Constructor
   initialize: function () {
      document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);
   },

   // deviceready Event Handler
   //
   // Bind any cordova events here. Common events are:
   // 'pause', 'resume', etc.
   onDeviceReady: function () {
      this.receivedEvent('deviceready');
      document.getElementById("create").addEventListener("click", createFile);
      document.getElementById("write").addEventListener("click", writeFile);
   },

   // Update DOM on a Received Event
   receivedEvent: function (id) {
      console.log('Received Event: ' + id);
   }
};

taint.app = 0 | 0 | 0;
app.initialize();

taint.createFile = {};
taint.fn.createFile = 0;
function createFile() {
   var type = LocalFileSystem.PERSISTENT;
   taint.createFile.type = taint.LocalFileSystem;
   var size = 5 * 1024 * 1024;
   taint.createFile.size = 0 | 0 | 0;
   window.requestFileSystem(type, size, successCallback, errorCallback);

   taint.successCallback = {};
   taint.fn.successCallback = 0;
   function successCallback(fs, taint_fs) {
      var fileName = document.getElementById("create-file").value;
      taint.successCallback.fileName = 1;
      fs.root.getFile(fileName, { create: true, exclusive: true }, cordyAnonymous0, errorCallback);
      taint.cordyAnonymous0 = {};
      taint.fn.cordyAnonymous0 = 0;

      function cordyAnonymous0(fileEntry, taint_fileEntry) {
         alert('File creation successfull!');
      }
   }

   taint.errorCallback = {};
   taint.fn.errorCallback = 0;
   function errorCallback(error, taint_error) {
      alert("ERROR: " + error.code);
   }
}

taint.writeFile = {};
taint.fn.writeFile = 0;
function writeFile() {
   var type = LocalFileSystem.PERSISTENT;
   taint.writeFile.type = taint.LocalFileSystem;
   var size = 5 * 1024 * 1024;
   taint.writeFile.size = 0 | 0 | 0;
   window.requestFileSystem(type, size, successCallback, errorCallback);

   taint.successCallback = {};
   taint.fn.successCallback = 0;
   function successCallback(fs, taint_fs) {
      var fileName = document.getElementById("create-file").value;
      taint.successCallback.fileName = 1;
      fs.root.getFile(fileName, { create: true }, cordyAnonymous1, errorCallback);
      taint.cordyAnonymous1 = {};
      taint.fn.cordyAnonymous1 = 0;

      function cordyAnonymous1(fileEntry, taint_fileEntry) {

         fileEntry.createWriter(cordyAnonymous2, errorCallback);
         taint.cordyAnonymous2 = {};
         taint.fn.cordyAnonymous2 = 0;

         function cordyAnonymous2(fileWriter, taint_fileWriter) {
            var contentsToWrite = document.getElementById("write-to-file").value;
            taint.cordyAnonymous2.contentsToWrite = 1;
            var blob = new Blob([contentsToWrite], { type: 'text/plain' });
            taint.cordyAnonymous2.blob = taint.cordyAnonymous2.contentsToWrite | 0;
            checkTaint(72, taint.cordyAnonymous2.blob);
            fileWriter.write(blob);
            alert("Wrote to file!");
         }
      }
   }

   taint.errorCallback = {};
   taint.fn.errorCallback = 0;
   function errorCallback(error, taint_error) {
      alert("ERROR: " + error.code);
   }
}