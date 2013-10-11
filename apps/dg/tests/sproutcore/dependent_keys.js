// ==========================================================================
//                SproutCore dependent keys Unit Test
//
//  Copyright ©2013 KCP Technologies, Inc., a McGraw-Hill Education Company
//
//  Licensed under the Apache License, Version 2.0 (the "License");
//  you may not use this file except in compliance with the License.
//  You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//  distributed under the License is distributed on an "AS IS" BASIS,
//  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  See the License for the specific language governing permissions and
//  limitations under the License.
// ==========================================================================

module("DG.authorizationController");

test("test of SproutCore's dependent keys functionality", function() {
  var bazDidChangeCount = 0;
  
  var foo = SC.Object.create({
                bar: null,
                baz: function() {
                    return this.getPath('bar.baz');
                }.property('bar.baz'),
                bazDidChange: function() {
                    console.log("foo.bazDidChange: baz = " + this.get('baz'));
                    ++ bazDidChangeCount;
                }.observes('baz')
            });
  var bar = SC.Object.create({
                baz: 1
            });
  foo.set('bar', bar);
  equals( bazDidChangeCount, 1, "Setting bar should trigger bazDidChange");
  bar.set('baz', 2);
  equals( bazDidChangeCount, 2, "Setting baz in bar should trigger bazDidChange");
});

