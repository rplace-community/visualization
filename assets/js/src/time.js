//Class used to work with array elements throughout time.
//It will return (with interpolation or not) an element from
//the internal array, after having specified the animation time we want
//in seekTime.
class Time {

  _setInterpolateBuffer(partition, nextPartition) {
    if (this._array.length > partition && this._array.length > nextPartition) {
      this._interpolateBuffer = this._interpolate(this._array[partition], this._array[nextPartition]);
    } else if (this._array.length > partition) {
      this._interpolateBuffer = this._interpolate(this._array[partition], this._array[partition]);
    } else {
      this._interpolateBuffer = t => undefined;
    }
  };

  _nextPartition(partitionNumber) {
    return (partitionNumber + 1) % this._array.length;
  };

  //Returns the partition number
  _getPartition(t) {

    let length = this._array.length - 1;

    if(length <= 0) {
      return 0;
    }


    const timeAsked = ((t % this._totalTime) + this._totalTime) % this._totalTime;
    const distBetElems = this._totalTime / length;
    const timeToPartition = timeAsked / distBetElems;
    
    const partition = Math.floor(timeToPartition);
    return partition;
  };

  //Returns the [0,1[ value to say how close to the next partition we are.
  _getInterTime(t) {

    let length = this._array.length - 1;

    if(length <= 0) {
      return 0;
    }

    const timeAsked = ((t % this._totalTime) + this._totalTime) % this._totalTime;
    const distBetElems = this._totalTime / length;
    const timeToPartition = timeAsked / distBetElems;
    return timeToPartition % 1;
  }





  constructor(arr, totalTime) {
    this._t = 0;
    this._partitionIdx = 0;
    this._array = arr;
    this._totalTime = totalTime > 0 ? totalTime : 1;

    this._interpolate = (arr1, arr2) => (t) => t <= 0.5 ? arr1 : arr2;
    this._setInterpolateBuffer(this._partitionIdx, this._nextPartition(this._partitionIdx));

    return this;
  };

  setArray(arr) {
    this._array = arr;
    this._setInterpolateBuffer(this._partitionIdx, this._nextPartition(this._partitionIdx));
  };

  setArrayInterpolation() {
    this._interpolate = (arr1, arr2) => d3.interpolateArray(
      arr1,
      arr2
    );
    this._setInterpolateBuffer(this._partitionIdx, this._nextPartition(this._partitionIdx));
    return this;
  };

  seekTime(t) {
    let partition = this._getPartition(t);
    if(partition != this._partitionIdx) {
      this._partitionIdx = partition;
      this._setInterpolateBuffer(this._partitionIdx, this._nextPartition(this._partitionIdx));
    }

    this._t = t;
  };

  get() {
    let interTime = this._getInterTime(this._t);
    return this._interpolateBuffer(interTime); 
  }

  hasData() {
    return this._array.length > 0;
  }

};
