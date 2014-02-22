//end the game and show original html
function showStartPage() {
	data.gameIsPlaying = false;
	$('#game').hide();
	$('#dom').show();
}
//After a level has been finished show scores and such, y'know
function showEndPage() {
	data.gameIsPlaying = false;
	$('#game').hide();
	//get good stuff from server:
}
//event handlers
$(document).on('click', '[id^="level-"]', function() {
	data.currentLevel = 'L' + $(this).attr('id').substring(6);
	startPlaying();
});
//keep canvas full screen
$(window).on("resize", function() {
	$("#game").css("width", window.innerWidth + "px");
	$("#game").css("height", window.innerHeight + "px");
});
//keyboard handlers
$(document).keyup(function(e) {
	//when user presses escape show start page
	if (e.keyCode == 27) { //esc
		showStartPage();
	}
});
$('#level-1').click(); //temp (start level 1 automatically)