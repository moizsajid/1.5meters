class Viewer2D {
  constructor() {
    window.addEventListener(
      "resize",
      function () {
        if (this.data) {
          this.renderScene(this.data);
        }
      }.bind(this)
    );
  }

  renderScene(data) {
    this.data = data;
    var canvas = document.getElementById("overlay");
    var ctx = canvas.getContext("2d");

    var fullImage = new Image();
    fullImage.src = $("#image").attr("src");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var xScale = $("#image").width() / fullImage.naturalWidth;
    var yScale = $("#image").height() / fullImage.naturalHeight;
    var xOffset = ($("#overlay").width() - $("#image").width()) / 2;
    var yOffset = ($("#overlay").height() - $("#image").height()) / 2;
    var canvasxScale = $("#overlay").width() / canvas.width;
    var canvasyScale = $("#overlay").height() / canvas.height;
    var i = 0;
    data.uv_shoulders.forEach((item) => {
      if (data.warned.has(i)) ctx.fillStyle = "red";
      else ctx.fillStyle = "green";
      ctx.fillRect(
        (item[0] * xScale + xOffset) / canvasxScale,
        (item[1] * yScale + yOffset) / canvasyScale,
        3,
        3
      );
      i++;
    });
  }
}

class Viewer3D {
  constructor(player) {
    var canvas = document.getElementById("mapCanvas");
    var engine = new BABYLON.Engine(canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
    });

    this.scene = new BABYLON.Scene(engine);
    this.scene.clearColor = new BABYLON.Color3(0.145, 0.145, 0.145);

    this.camera = new BABYLON.ArcRotateCamera(
      "Camera",
      0,
      0,
      10,
      new BABYLON.Vector3(0, 0, 0),
      this.scene
    );
    this.camera.radius = 30;
    this.camera.useAutoRotationBehavior = true;
    this.camera.attachControl(canvas, false);
    this.camera.setPosition(new BABYLON.Vector3(0, 15, -10));
    this.camera.setTarget(new BABYLON.Vector3(0, 0, 10));

    var light = new BABYLON.HemisphericLight(
      "light1",
      new BABYLON.Vector3(0, 1, 0),
      this.scene
    );

    var arrow = BABYLON.MeshBuilder.CreateCylinder(
      "arrow",
      { diameterBottom: 1, diameterTop: 0, height: 1 },
      this.scene
    );
    arrow.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.WORLD);
    var arrowstem = BABYLON.MeshBuilder.CreateCylinder(
      "arrowstem",
      { diameterBottom: 0.5, diameterTop: 0.5, height: 1 },
      this.scene
    );
    arrowstem.rotate(BABYLON.Axis.X, Math.PI / 2, BABYLON.Space.WORLD);
    arrowstem.translate(BABYLON.Axis.Z, -1, BABYLON.Space.WORLD);
    arrowstem.translate(BABYLON.Axis.Y, 1, BABYLON.Space.WORLD);

    arrow.position.y = 1;
    var ground = BABYLON.MeshBuilder.CreateGround(
      "gd",
      { width: 500, height: 500, subdivisions: 100 },
      this.scene
    );
    var wireframe = new BABYLON.StandardMaterial("material", this.scene);
    wireframe.wireframe = true;
    ground.material = wireframe;

    this.scene.onPointerDown = () => {
      var pickResult = this.scene.pick(
        this.scene.pointerX,
        this.scene.pointerY
      );
      if (pickResult.hit) {
        var name = pickResult.pickedMesh.name;
        if (name.includes("person") || name.includes("bounds")) {
          player.registerInfection(Number(name.substring(7)));
          player.render();
        }
      }
    };

    engine.runRenderLoop(
      function () {
        this.scene.render();
      }.bind(this)
    );

    window.addEventListener("resize", function () {
      engine.resize();
    });

    this.activeItems = [];
  }

  renderScene(data) {
    this.activeItems.forEach((item) => {
      item.dispose(true, true);
    });

    var xCentre = (data.maxX + data.minX) / 2;
    var zCentre = (data.maxZ + data.minZ) / 2;

    var green = new BABYLON.StandardMaterial("green", this.scene);
    green.diffuseColor = new BABYLON.Color3(0, 1, 0);
    var red = new BABYLON.StandardMaterial("red", this.scene);
    red.diffuseColor = new BABYLON.Color3(1, 0, 0);
    var yellow = new BABYLON.StandardMaterial("red", this.scene);
    yellow.diffuseColor = new BABYLON.Color3(1, 1, 0.09);

    var i = 0;
    data.xyz_real.forEach((item) => {
      var sphere = BABYLON.MeshBuilder.CreateCylinder(
        `person:${i}`,
        { diameterBottom: 0.5, diameterTop: 0.5, height: 1 },
        this.scene
      );
      this.activeItems.push(sphere);
      var boundary = BABYLON.MeshBuilder.CreateCylinder(
        `bounds:${i}`,
        {
          diameterBottom: data.safeDistance,
          diameterTop: data.safeDistance,
          height: 0.2,
        },
        this.scene
      );
      this.activeItems.push(boundary);
      sphere.position.y = boundary.position.y = 1;
      sphere.position.x = boundary.position.x = item[0];
      sphere.position.z = boundary.position.z = item[2];
      sphere.material = green;

      if (data.warned.has(i)) {
        boundary.material = red;
      } else {
        boundary.material = green;
      }

      if (data.currentInfected.has(i)) {
        sphere.material = yellow;
      } else {
        sphere.material = green;
      }

      var plane = BABYLON.MeshBuilder.CreatePlane(
        "plane" + i,
        { width: 2, size: 5, tileSize: 1 },
        this.scene
      );
      this.activeItems.push(plane);
      plane.parent = sphere;
      plane.position.y = 4;

      var materialPlane = new BABYLON.StandardMaterial(
        "texturePlane" + i,
        this.scene
      );
      materialPlane.diffuseTexture = new BABYLON.Texture(
        "data:thumb" + i,
        this.scene,
        true,
        true,
        BABYLON.Texture.BILINEAR_SAMPLINGMODE,
        null,
        null,
        data.thumbnails[i],
        true
      );
      this.activeItems.push(materialPlane);
      materialPlane.specularColor = new BABYLON.Color3(0, 0, 0);
      plane.material = materialPlane;
      plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;

      i++;
    });

    data.warnings.forEach((warning) => {
      var item1 = data.xyz_real[warning[0]];
      var item2 = data.xyz_real[warning[1]];
      var points = [
        new BABYLON.Vector3(item1[0], 1.4, item1[2]),
        new BABYLON.Vector3(item2[0], 1.4, item2[2]),
      ];
      var lines = BABYLON.MeshBuilder.CreateLines(
        "lines",
        { points: points },
        this.scene
      );
      this.activeItems.push(lines);
    });
  }
}
