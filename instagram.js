//ตัวแปร
var imagesData = [];
var queueData = [];
var firstload;
var nextUrl;
var allCount = 0;

Parse.$ = jQuery;

Parse.initialize("inlWM1XaM7Sq4S0cWiRaK8Wo5otR9N7IEosB8OTo",
                 "S3B0N0lwM3YEmRtGoejHc2x4Z3VcUfnO87g1wV1n");

$(function() {
  var MainView = Parse.View.extend({
    el: $("#main"),
    initialize: function(){
      this.render();
    },
    render: function(){
      if(Parse.User.current()){
        checkUserInfo();
      } else {
        new LoginView();
      }
    }
  });

  var LoginView = Parse.View.extend({
    events: {
      "click .login-ig" : "login_ig"
    },
    el: $(".content"),
    initialize: function(){
      this.render();
    },
    render: function(){
      this.$el.html(_.template($("#login-template").html()));
      this.delegateEvents();
      this.getToken();
    },

    login_ig: function(){
      var clientId = 'e7d4c9defe4b4b19ab1185243bd83086',
      redirectUri = 'http://localhost:8888/instagram.html',
      myUrl = 'https://instagram.com/oauth/authorize/?client_id=' + clientId + '&redirect_uri=' + redirectUri + '&response_type=token' + (this.scope || '');
      window.location.href = myUrl;
    },

    getToken: function(){
      var param = 'access_token';
      var regex = new RegExp("(?:&|#)" + param + "=([a-z0-9._-]+)", "i");
      var matches = window.location.hash.match(regex);
      if (matches) {
        var removeRegex = new RegExp("(?:&|#)" + param + "=" + matches[1], "i");
        window.location.hash = window.location.hash.replace(removeRegex, '');
        console.log(matches[1]);
        if(matches[1]){
          this.findAccount(matches[1]);
        }
      }
    },

    findAccount: function(token){
      var self = this;
      var query = new Parse.Query(Parse.User);
      query.equalTo("accessToken" , token);
      query.find({
        success: function(user){
          if(user[0]){
          BootstrapDialog.alert("old user ");
            var name = user[0].get("username");
            Parse.User.logIn(name, "123456", {
              success: function(){
                checkUserInfo();
                self.undelegateEvents();
                delete self;
              },
              error: function(user, error){
                alert("Error: " + error.code + " " + error.message);
              }
            });
          } else {
            BootstrapDialog.alert("new user");
            var user = new Parse.User();
            user.set("username", "test" + token);
            user.set("password", "123456");
            user.set("accessToken", token);
            user.set("timePost", 0);
            user.set("limitPost", 2);
            var date = new Date();
            user.set("nextPostDate", date);
            date.setMonth(date.getMonth() + 1);
            user.set("expireDate" ,date);
            user.set("Time Pay" ,0);

            user.signUp(null, {
              success: function(user) {
                console.log("new created success");
                new InfoView();
                self.undelegateEvents();
                delete self;
              },
              error: function(user, error) {
                alert("Error: " + error.code + " " + error.message);
              }
            });
          }
        },
        error: function(user, error) {
          alert("Error: " + error.code + " " + error.message);
        }
      });
    }
  });

  var InfoView = Parse.View.extend({
    events: {
      "click .submit-line" : "submit"
    },
    el: $(".content"),
    initialize: function() {
      this.render();
    },
    render: function() {
      this.$el.html(_.template($("#info-template").html()));
      this.delegateEvents();
      this.queryMarket();

    },
    queryMarket: function() {
      var Market = Parse.Object.extend("Market");
      var query = new Parse.Query(Market);
      query.find({
        success: function(data){
          var list = "";
          for(i = 0; i < data.length; i++)
          {
            console.log(data[i].get("name"));
            list += '<li><a href="#">' + data[i].get("name") + '</a></li>'
          }
          $(".market-list").append(list);
        }
      });
    },
    submit: function(){
      var self = this;
      var lineId = this.$("#line-id").val();
      var email = this.$("#email").val();
      if(lineId && email){
        var user = Parse.User.current();
        user.set("lineId", lineId);
        user.set("email", email);
        user.save(null, {
          success: function(){
            BootstrapDialog.alert("save line success");
            new ProfileView();
            self.undelegateEvents();
            delete self;
          }
        })
      } else {
        BootstrapDialog.alert("Line ID is required");
      }
    }
  });

  var ProfileView = Parse.View.extend({
    events: {
      "click .logout-ig" : "logout_ig",
      "click .loadmore" : "loadmore"
    },
    el: $(".content"),
    initialize: function() {
      this.render();
      imagesData = [];
    },
    render: function() {
      this.$el.html(_.template($("#profile-template").html()));
      this.delegateEvents();
      var user = Parse.User.current();
      var token = user.get("accessToken");
      if(token){
        firstload = true;
        nextUrl = 'https://api.instagram.com/v1/users/self/media/recent';
        getSelfPhoto(token);
      }
    },
    logout_ig: function() {
      var self = this;
      Parse.User.logOut();
      new LoginView();
      self.undelegateEvents();
      delete self;
    },
    loadmore: function(){
      var user = Parse.User.current();
      var token = user.get("accessToken");
      getSelfPhoto(token);
    }
  });

  function checkUserInfo(){
    var user = Parse.User.current();
    user.fetch({
      success: function(userAgain){
        var lineId = userAgain.get("lineId"),
        email = userAgain.get("email");
        if(lineId && email){
          new ProfileView();
        }
        else{
          new InfoView();
        }
      }
    });
  }

  function getSelfPhoto(token){
    var num_photos = 12;
    var url = nextUrl;
    $.ajax({
      url: url,
      dataType: 'jsonp',
      type: 'GET',
      data: {access_token: token, count: num_photos},
      success: function(data){
        console.log(data);
        nextUrl = data.pagination.next_url;
        if(firstload){
          $("#profile-pic").append('<img class="img-circle" src="' + data.data[0].user.profile_picture + '">')
          $("#username").append(data.data[0].user.username);
          firstload = false;
        }
        imagesData = imagesData.concat(data.data);
        var mediaIds = [];
        for (i = 0 ; i < imagesData.count ; i ++) {
          mediaIds[i] = imagesData[i].id;
        }
        getQueueData(data.data, mediaIds);
      },
      error: function(data){
        console.log(data);
      }
    });
  }

  function getQueueData(sender, ids){
    var Queue = Parse.Object.extend("Queue");
    var query = new Parse.Query(Queue);
    query.equalTo("user", Parse.User.current());
    // query.containedIn("mediaId", ids);
    query.find({
      success: function(data){
        console.log(data.length);
        var jsonArr = [];
        for (var i = 0; i < data.length; i++) {
          jsonArr.push({
            id: data[i].get("mediaId"),
            optionValue: 1
          });
        }
        console.log(jsonArr);
        createTable(sender, jsonArr);
      }
    });
  }

  function createTable(sender, jsonArr){
    var count = 0;
    var row = sender.length/3;

    var appendString = "";
    for(i = 0 ; i < row ; i++){

      appendString += '<div class="row">';

      for(j = 0 ; j < 3 ; j ++){

        if(count === sender.length)
          break;
        appendString += '<div class="col-xs-4 my_colum"><a data-toggle="modal" data-target="#myModal" onclick="showData(' + allCount + ')"><img ';
        for (k = 0; k < jsonArr.length; k ++ ){
          if(jsonArr[k].id === sender[count].id) {
            appendString += 'style="opacity:0.3" ';
            break;
          }
        }
        appendString += 'class="img-responsive" src="'+sender[count].images.standard_resolution.url+'"></a></div>';
        count++;
        allCount++;

      }

      appendString += '</div>';

    }
    $(".my-table").append(appendString);
  }
  new InfoView();
  // new MainView;
});

function showData(index){
  console.log(index);
  console.log(imagesData[index]);
  BootstrapDialog.show({
    title: 'Queue',
    message: 'Choose this image ?',
     buttons: [{
         label: 'Save Queue',
         action: function(dialogItself){
            saveQueue(index);
            dialogItself.close();
         }
     }, {
         label: 'Close',
         action: function(dialogItself){
             dialogItself.close();
         }
     }]
   });
}

function saveQueue(index){
  var Que = Parse.Object.extend("Queue");
  var que = new Que();

  var obj = imagesData[index];

  que.set("mediaId", obj.id);
  que.set("caption", obj.caption.text);
  que.set("mediaCreatedAt", obj.created_time);
  que.set("postLink", obj.images.standard_resolution.url)
  que.set("height", obj.images.standard_resolution.height);
  que.set("width", obj.images.standard_resolution.width);
  que.set("link", obj.link);
  que.set("user", Parse.User.current());

  que.save(null, {
    success: function(){
      console.log("que successs");
    }
  });

}
