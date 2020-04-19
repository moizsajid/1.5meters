class Player {
  constructor() {
    this.infections = new Set();
    this.transmissions = 0;
  }

  analyseResponse(data) {
    data.safeDistance = 1.5;

    data.currentInfected = new Set();

    data.maxX = data.xyz_real[0][0];
    data.minX = data.xyz_real[0][0];
    data.maxZ = data.xyz_real[0][2];
    data.minZ = data.xyz_real[0][2];

    var minDistSum = 0;
    var minDistCount = 0;

    data.warnings = new Set();
    data.warned = new Set();
    var i = 0;
    data.xyz_real.forEach((item) => {
      if (item[0] < data.minX) data.minX = item[0];
      if (item[2] < data.minZ) data.minZ = item[2];
      if (item[0] > data.maxX) data.maxX = item[0];
      if (item[2] > data.maxZ) data.maxZ = item[2];

      var j = 0;
      var minDist = null;
      data.xyz_real.forEach((otherItem) => {
        if (i != j) {
          distance = Math.sqrt(
            Math.pow(item[0] - otherItem[0], 2) +
              Math.pow(item[2] - otherItem[2], 2)
          );
          if (!minDist || distance < minDist) {
            minDist = distance;
          }
          if (distance < data.safeDistance) {
            data.warned.add(i);
            data.warned.add(j);
            data.warnings.add([i, j]);
          }
        }
        j++;
      });

      if (minDist) {
        minDistSum += minDist;
        minDistCount++;
      }

      var inf = 0;
      this.infections.forEach((infection) => {
        distance = Math.sqrt(
          Math.pow(item[0] - infection[0], 2) +
            Math.pow(item[2] - infection[1], 2)
        );

        if (distance < data.safeDistance + 0.5) {
          data.currentInfected.add(i);
        }
        inf++;
      });

      i++;
    });
    if (data.currentInfected.size - this.infections.size > 0)
      this.transmissions += data.currentInfected.size - this.infections.size;

    this.infections = new Set();
    data.currentInfected.forEach((person) => {
      this.registerInfection(person);
    });

    var distanceRate = 100 - (100 * data.warned.size) / data.boxes.length;
    $("#distancing").text(distanceRate.toFixed(2) + "%");

    if (minDistCount > 0) {
      $("#distance").text("~" + (minDistSum / minDistCount).toFixed(2) + "m");
    } else {
      $("#distance").text("-");
    }

    return data;
  }

  render() {
    $("#image").attr("src", this.data[this.position].image);
    $("#frame").attr("placeholder", `${this.position}/${this.end - 1}`);
    setTimeout(
      function () {
        var annotated = this.analyseResponse(this.data[this.position]);
        viewer2d.renderScene(annotated, annotated.image);
        viewer3d.renderScene(annotated);
        $("#infected").text(this.transmissions);
      }.bind(this),
      100
    );
  }

  load(data) {
    this.data = data;
    this.position = 0;
    this.end = this.data.length;
    this.render();

    if (this.end == 1) {
      $(".control").fadeOut();
    } else {
      $(".control").fadeIn();
    }
  }

  skip(frame) {
    if (this.end && frame < this.end && frame >= 0) {
      this.position = frame;
      this.render();
    }
  }

  play(delay) {
    if (this.playback) {
      clearInterval(this.playback);
      this.playback = null;
    } else {
      this.playback = setInterval(
        function () {
          this.position++;
          if (this.position >= this.end) {
            this.position = 0;
          }
          this.render();
        }.bind(this),
        delay
      );
    }
  }

  registerInfection(person) {
    this.infections.add([
      this.data[this.position].xyz_real[person][0],
      this.data[this.position].xyz_real[person][2],
    ]);
  }

  resetInfections() {
    this.infections = new Set();
    this.transmissions = 0;
    this.render();
  }
}

$(document).ready(function () {
  player = new Player();
  viewer2d = new Viewer2D();
  viewer3d = new Viewer3D(player);

  $("#upload").click(function () {
    $("#inputfile").click();
  });

  $("#forward").click(function () {
    player.skip(player.position + 1);
  });

  $("#backward").click(function () {
    player.skip(player.position - 1);
  });

  $("#play").click(function () {
    player.play(500);
  });

  $("#reset").click(function () {
    player.resetInfections();
  });

  $("#frame").keyup(function (e) {
    if (e.keyCode == 13) {
      var frameNumber = Number($(this).val());
      $(this).val("");
      $(this).blur();
      player.skip(frameNumber);
    }
  });

  $("#inputfile").on("change", function (event) {
    var file = document.querySelector("input[type=file]");

    try {
      if (
        file.files[0].name.includes(".jpg") ||
        file.files[0].name.includes(".png") ||
        file.files[0].name.includes(".jpeg")
      ) {
        var reader = new FileReader();
        reader.onload = () => {
          imgBase64 = reader.result;
          // Websocket currently only for localhost
          $("#image").attr("src", imgBase64);
          var ws = new WebSocket("ws://localhost:8765/");

          ws.onmessage = (event) => {
            data = JSON.parse(event.data);
            player.load([data]);
          };

          ws.onopen = () => {
            ws.send(imgBase64);
            console.log("Image sent");
          };
        };
        reader.readAsDataURL(file.files[0]);
      } else if (file.files[0].name.includes(".json")) {
        var jsonReader = new FileReader();
        jsonReader.onload = () => {
          var data = JSON.parse(jsonReader.result);
          player.load(data);
        };
        jsonReader.readAsText(file.files[0]);
      } else {
        alert("Invalid File Type");
      }
    } catch (error) {
      alert("Invalid File Type");
    }
  });
});
