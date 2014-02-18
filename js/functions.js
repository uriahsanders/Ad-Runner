var inArray = function(arr, key){
	var ret = false;
	arr.forEach(function(entry){
		if(key == entry) ret = true;
	});
	return ret;
};
var removeFromArray = function(arr, item){
	arr.splice(arr.indexOf(item), 1);
};