//
//  iosRemoveTarget.js
//  This hook runs for the iOS platform when the plugin or platform is removed.
//
// Source: https://github.com/DavidStrausz/cordova-plugin-today-widget
//

//
// The MIT License (MIT)
//
// Copyright (c) 2017 DavidStrausz
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.
//

const PLUGIN_ID = 'cordova-plugin-push';

var fs = require('fs');
var path = require('path');

function redError (message) {
  return new Error('"' + PLUGIN_ID + '" \x1b[1m\x1b[31m' + message + '\x1b[0m');
}

// Determine the full path to the app's xcode project file.
// XCodeのプロジェクトファイルのフルパスを特定
function findXCodeproject (context, callback) {
  fs.readdir(iosFolder(context), function (err, data) {
    var projectFolder;
    var projectName;
    // Find the project folder by looking for *.xcodeproj
    if (data && data.length) {
      data.forEach(function (folder) {
        if (folder.match(/\.xcodeproj$/)) {
          projectFolder = path.join(iosFolder(context), folder);
          projectName = path.basename(folder, '.xcodeproj');
        }
      });
    }

    if (!projectFolder || !projectName) {
      throw redError('Could not find an .xcodeproj folder in: ' + iosFolder(context));
    }

    if (err) {
      throw redError(err);
    }

    // XCodeが見つかったら、設定された処理を実行
    callback(projectFolder, projectName);
  });
}

// Determine the full path to the ios platform
// iOSプラットフォームのフルパスを返す
function iosFolder (context) {
  return context.opts.cordova.project
    ? context.opts.cordova.project.root
    : path.join(context.opts.projectRoot, 'platforms/ios/');
}

function parsePbxProject (context, pbxProjectPath) {
  var xcode = require('xcode');
  console.log('    Parsing existing project at location: ' + pbxProjectPath + '...');
  var pbxProject;
  if (context.opts.cordova.project) {
    pbxProject = context.opts.cordova.project.parseProjectFile(context.opts.projectRoot).xcode;
  } else {
    pbxProject = xcode.project(pbxProjectPath);
    pbxProject.parseSync();
  }
  return pbxProject;
}

function forEachNotificationExtensionFile (context, callback) {
  var notificaitonExtensionFolder = path.join(iosFolder(context), 'NotificationExtension');
  fs.readdirSync(notificaitonExtensionFolder).forEach(function (name) {
    // Ignore junk files like .DS_Store
    if (!/^\..*/.test(name)) {
      callback({
        name:name,
        path:path.join(notificaitonExtensionFolder, name),
        extension:path.extname(name)
      });
    }
  });
}

// Return the list of files in the notification extension project, organized by type
// NotificationExtentionのファイルを返す
function getNotificationExtensionFiles (context) {
  var files = { source: [], plist: [], resource: [] };
  var FILE_TYPES = { '.h': 'source', '.m': 'source', '.plist': 'plist' };
  forEachNotificationExtensionFile(context, function (file) {
    var fileType = FILE_TYPES[file.extension] || 'resource';
    files[fileType].push(file);
  });
  return files;
}

console.log('Removing target "' + PLUGIN_ID + '/NotificationExtension" to XCode project');

module.exports = function (context) {
  var Q = require('q');
  var deferral = Q.defer();

  findXCodeproject(context, function (projectFolder, projectName) {
    console.log('  - Folder containing your iOS project: ' + iosFolder(context));

    var pbxProjectPath = path.join(projectFolder, 'project.pbxproj');
    var pbxProject = parsePbxProject(context, pbxProjectPath);
    var files = getNotificationExtensionFiles(context);

    // Find if the project already contains the target and group
    // targetにすでに含まれているかチェック
    var target = pbxProject.pbxTargetByName('NotificationExtension');
    var pbxGroupKey = pbxProject.findPBXGroupKey({ name: 'NotificationExtension' });

    // Remove the PbxGroup from cordovas "CustomTemplate"-group
    // CustomTemplateの値を削除
    if (pbxGroupKey) {
      var customTemplateKey = pbxProject.findPBXGroupKey({ name: 'CustomTemplate' });
      pbxProject.removeFromPbxGroup(pbxGroupKey, customTemplateKey);

      // Remove files which are not part of any build phase (config)
      // どのビルド フェーズにも含まれていないファイルを削除します (config)
      files.plist.forEach(function (file) {
        pbxProject.removeFile(file.name, pbxGroupKey);
      });

      // Remove source files to our PbxGroup and our newly created PBXSourcesBuildPhase
      // ソース ファイルを PbxGroup と新しく作成した PBXSourcesBuildPhase から削除します
      files.source.forEach(function (file) {
        pbxProject.removeSourceFile(file.name, { target: target.uuid }, pbxGroupKey);
      });

      //  Remove the resource file and include it into the targest PbxResourcesBuildPhase and PbxGroup
      // リソース ファイルを削除し、ターゲットの PbxResourcesBuildPhase と PbxGroup に含めます
      files.resource.forEach(function (file) {
        pbxProject.removeResourceFile(file.name, { target: target.uuid }, pbxGroupKey);
      });
    }

    // Add a new PBXFrameworksBuildPhase for the Frameworks used by the Share Extension
    // (NotificationCenter.framework, libCordova.a)
    // var frameworksBuildPhase = pbxProject.addBuildPhase(
    //   [],
    //   'PBXFrameworksBuildPhase',
    //   'Frameworks',
    //   target.uuid
    // );
    // if (frameworksBuildPhase) {
    //   log('Successfully added PBXFrameworksBuildPhase!', 'info');
    // }

    // Add the frameworks needed by our shareExtension, add them to the existing Frameworks PbxGroup and PBXFrameworksBuildPhase
    // var frameworkFile1 = pbxProject.addFramework(
    //   'NotificationCenter.framework',
    //   { target: target.uuid }
    // );
    // var frameworkFile2 = pbxProject.addFramework('libCordova.a', {
    //   target: target.uuid,
    // }); // seems to work because the first target is built before the second one
    // if (frameworkFile1 && frameworkFile2) {
    //   log('Successfully added frameworks needed by the share extension!', 'info');
    // }

    // if (resourcesBuildPhase) {
    //   console.log('    Successfully added PBXResourcesBuildPhase!');
    // }

    // Add build settings for Swift support, bridging header and xcconfig files
    // var configurations = pbxProject.pbxXCBuildConfigurationSection();
    // for (var key in configurations) {
    //   if (typeof configurations[key].buildSettings !== 'undefined') {
    //     var buildSettingsObj = configurations[key].buildSettings;
    //     if (typeof buildSettingsObj['PRODUCT_NAME'] !== 'undefined') {
    //       var productName = buildSettingsObj['PRODUCT_NAME'];
    //       if (productName.indexOf('ShareExtension') >= 0) {
    //         if (addXcconfig) {
    //           configurations[key].baseConfigurationReference =
    //             xcconfigReference + ' /* ' + xcconfigFileName + ' */';
    //           log('Added xcconfig file reference to build settings!', 'info');
    //         }
    //         if (addEntitlementsFile) {
    //           buildSettingsObj['CODE_SIGN_ENTITLEMENTS'] = '"' + 'ShareExtension' + '/' + entitlementsFileName + '"';
    //           log('Added entitlements file reference to build settings!', 'info');
    //         }
    //       }
    //     }
    //   }
    // }

    // Write the modified project back to disc
    // 変更されたプロジェクトをディスクに書き戻します
    // console.log('    Writing the modified project back to disk...');
    fs.writeFileSync(pbxProjectPath, pbxProject.writeSync());
    console.log('Removed NotificationExtension from XCode project');

    deferral.resolve();
  });

  return deferral.promise;
};
