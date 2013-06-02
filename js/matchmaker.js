$(document).ready(function() {
	$('input[name="generate"]').click(function(event){
		event.preventDefault();
		playerNum = $('input[name="playerNum"]').val();
		if(playerNum == ""){
			playerNum = 1000;
			$('input[name="playerNum"]').val(1000);
		}

		if(playerNum != "" && !isNaN(playerNum)){
			generateTanks();
			generatePlayers(playerNum);
			generatePlatoons(playerNum);
		}
		else{
			alert('Please enter a number');
		}
	});

	$('a[name="matchmake"]').click(function(event){
		event.preventDefault();
		if(typeof tanks === 'undefined'){
			alert('Please generate some tanks and players first');
		}
		else{
			if((typeof matchCounter !== "undefined")){
				// clear any existing match listing tables
				$('.matchTable').dataTable().fnDestroy();
			}
			
			matchMaker();
		}
	});
});

function generatePlayers(numOfPlayers){
	players = [];
	var data = [];

	for (var i = 0; i < numOfPlayers; i++) {
		var obj = {
			name: i,
			eff: Math.floor((Math.random()*1600)+300),
			tank: tanks[Math.floor(Math.random()*tanks.length)],
			battlePoints: 0
		};

		obj.battlePoints = Math.floor(obj.eff / 100) + obj.tank.tier;

		players.push(obj);
		data.push([obj.name, obj.eff, obj.tank.name, obj.battlePoints]);
	}
	population = players.slice();
	console.log(population);
	$('#playerTable').dataTable().fnClearTable();
	$('#playerTable').dataTable().fnAddData(data);
}