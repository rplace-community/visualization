let cmdWorker;
const _worker = self;

if ("undefined" === typeof window) {
  // we are in the WebWorker context
  importScripts("gaussian_blur.js");
  _worker.onmessage = function(event) {
    const { id, data } = event.data;
    let resp, error;
    switch (data.command) {
      case "blurImages":
        if (data.payload && data.payload.images && data.payload.radius) {
          resp = blurImages(data.payload.images, data.payload.radius);
        }
        break;
      case "emaImages":
        if (data.payload && data.payload.images && data.payload.range) {
          resp = ema(data.payload.images, data.payload.range);
        }
        break;
      case "sumImages":
        if (data.payload && data.payload.images) {
          resp = sumImages(data.payload.images);
        }
        break;
      case "mergeLevelmaps":
        if (
          data.payload &&
          data.payload.images &&
          data.payload.images.length > 0 &&
          (data.payload.radius || data.payload.range)
        ) {
          resp = sumCommunities(data.payload.images);
          if (data.payload.range) {
            if (data.payload.ema) {
              resp = ema(resp, data.payload.range);
            } else {
              resp = flatSum(resp, data.payload.range);
            }
          }
        }
        break;

      default:
        error = "Unknown command";
    }
    _worker.postMessage({ id, resp, error });
  };

  function ema(arr, range) {
    var k = 2 / (range + 1);
    // first item is just the same as the first item in the input
    let res = [arr[0]];
    // for the rest of the items, they are computed with the previous one
    for (var i = 1; i < arr.length; i++) {
      arr[i].forEach((px, j) => {
        arr[i][j] = px * k;
      });
      const prev = res[i - 1].map(px => px * (1 - k));
      arr[i].forEach((v, j) => {
        arr[i][j] = v + prev[j];
      });
      res.push(arr[i]);
    }
    return res;
  }

  function flatSum(arr, range) {
    let buffer = [arr[0].slice(0)];
    let res = [arr[0]];
    // for the rest of the items, they are computed with the previous one
    for (var i = 1; i < arr.length; i++) {
      buffer.push(arr[i].slice(0));
      arr[i].forEach((v, j) => {
        arr[i][j] += res[i - 1][j];
        if (buffer.length > range) {
          arr[i][j] -= buffer[0][j];
        }
      });
      if (buffer.length > range) {
        buffer = buffer.slice(1);
      }
      res.push(arr[i]);
    }
    return res;
  }

  function blurImages(images, radius) {
    images.forEach(im => blurMonoFloat32(im, 200, 200, radius));
    return images;
  }

  function sumCommunities(communities) {
    if (communities && communities.length > 1) {
      communities[0].forEach((image, i) => {
        image.forEach((v, pixel) => {
          communities[0][i][pixel] = communities.reduce(
            (a, b) => a + b[i][pixel],
            0
          );
        });
      });
      return communities[0];
    } else if (communities && communities.length > 0) {
      return communities[0];
    } else {
      return communities;
    }
  }
  //
} else {
  // we are in the webpage context
  class CommandWorker {
    constructor() {
      this.requests = {};
      this.requestsCounter = 0;
      this.receive = this.receive.bind(this);
      this.send = this.send.bind(this);
      this.worker = new Worker("assets/js/src/utils.js");
      this.worker.onmessage = this.receive;
    }

    send(command, payload) {
      const id = `request-${this.requestsCounter++}`;

      return new Promise((resolve, reject) => {
        this.requests[id] = ({ resp, error }) => {
          if (error) {
            reject(error);
            return;
          }

          resolve(resp);
        };

        this.worker.postMessage({
          id,
          data: { command: command, payload: payload }
        });
      });
    }

    receive(event) {
      const { id, resp, error } = event.data;

      if (typeof this.requests[id] === "function") {
        this.requests[id]({ resp, error });
        delete this.requests[id];
      }
    }
  }

  if (typeof Worker === "undefined") {
    console.log("Webworker not supported !!!");
  } else {
    cmdWorker = new CommandWorker();
  }

  function fetchImagesData(urls, observer) {
    return fetchImages(urls, observer).then(images =>
      images.map(im => {
        let canvas = document.createElement("canvas");
        canvas.width = im.width;
        canvas.height = im.height;
        let context = canvas.getContext("2d");
        context.drawImage(im, 0, 0);
        let data = context.getImageData(0, 0, im.width, im.height).data;
        return data;
      })
    );
  }

  function fetchImages(urls, observer) {
    return Promise.all(
      urls.map(url => {
        return fetch(url)
          .then(response => response.blob())
          .then(blob => {
            const url = URL.createObjectURL(blob);
            let im = new Image();
            im.src = url;

            return new Promise(function(resolve, reject) {
              im.onload = () => resolve(im);
            });
          })
          .then(im => {
            if (observer) {
              observer(url);
            }
            return im;
          });
      })
    );
  }
}
