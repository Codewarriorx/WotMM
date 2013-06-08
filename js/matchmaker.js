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

function matchMaker(){
	players = population.slice();
	console.log('match making');
	$('#matchContainer').html('');
	unMadeMatches = [];
	madeMatches = [];
	matchCounter = 0;

	for (var i = 0; i < platoons.length; i++) { // loop through all platoons in queue
		var platoon = getPlatoon();

		if(unMadeMatches.length == 0 || checkUnMadeMatches(unMadeMatches, platoon) == -1){ // check if there are any un-made matches or if the platoon doesn't qualify for existing un-made matches
			// create the match around the platoon stats and tank
			var match = {
				id: matchCounter,
				tier: platoon.tier,
				upperTier: (platoon.tier),
				lowerTier: (platoon.tier - 2),
				upperEff: (platoon.eff + 200),
				lowerEff: (platoon.eff - 200),
				battlePoints: platoon.battlePoints,
				platoons: [],
				playersPerTeam: [0, 0],
				artyPerTeam: [0, 0],
				numOfPlayers: 0,
				timeCreated: Date.now(),
				teams: null,
				timeFilled: 0
			}

			if(platoon.numOfArty > 0){
				match.artyPerTeam[0] = platoon.numOfArty;
			}

			match.playersPerTeam[0] = platoon.numOfPlayers;
			match.platoons.push(platoon); // add platoon to the match
			match.numOfPlayers += platoon.numOfPlayers;
			matchCounter++;
			unMadeMatches.push(match); // add match to the un-made stack
		}
		else{ // platoon qualifies for a match
			var matchIndex = checkUnMadeMatches(unMadeMatches, platoon); // get the index
			unMadeMatches[matchIndex].platoons.push(platoon); // push platoon into the match
			unMadeMatches[matchIndex].numOfPlayers += platoon.numOfPlayers;
			unMadeMatches[matchIndex].battlePoints += platoon.battlePoints;
			
			if(platoon.numOfArty > 0 && (unMadeMatches[matchIndex].artyPerTeam[0] + platoon.numOfArty) <= 3){
				unMadeMatches[matchIndex].artyPerTeam[0] += platoon.numOfArty;
			}
			else if(platoon.numOfArty > 0 && (unMadeMatches[matchIndex].artyPerTeam[1] + platoon.numOfArty) <= 3){
				unMadeMatches[matchIndex].artyPerTeam[1] += platoon.numOfArty;
			}

			if((unMadeMatches[matchIndex].playersPerTeam[0] + platoon.numOfPlayers) <= 15){
				unMadeMatches[matchIndex].playersPerTeam[0] += platoon.numOfPlayers;
			}
			else{
				unMadeMatches[matchIndex].playersPerTeam[1] += platoon.numOfPlayers;
			}

			if(unMadeMatches[matchIndex].numOfPlayers == 30){ // is the match full?
				// put timestamp in match for when it was finished
				unMadeMatches[matchIndex].timeFilled = Date.now();
				// move match to the made matches stack
				madeMatches.push(unMadeMatches[matchIndex]);
				// remove match from un-made matches
				unMadeMatches.splice(matchIndex, 1);
			}
		}
	}

	var stats = {
		UnMadeMatches: unMadeMatches.length,
		madeMatches: madeMatches.length,
		total: matchCounter
	};

	var source = $('#statListing').html();
	var template = Handlebars.compile(source);

	$('#stats').html(template(stats));
	balanceTeams();
	displayMatches();
}

function getPlatoon(){
	var id = Math.floor(Math.random()*platoons.length);
	var platoon = platoons[id];
	platoons.splice(id, 1);
	return platoon;
}

function displayMatches(){
	var data = [];

	// Clear containers
	$('#madeContainer').html('');
	$('#unMadeContainer').html('');

	madeMatches.forEach(function(element, index, array){
		var source = $('#matchTable').html();
		var template = Handlebars.compile(source);

		$('#madeContainer').append(template(element));

		data.push([element.id, element.lowerTier+' - '+element.upperTier, element.lowerEff+' - '+element.upperEff, element.timeFilled-element.timeCreated, element.platoons.length, element.battlePoints, element.numOfPlayers]);
	});

	unMadeMatches.forEach(function(element, index, array){
		var source = $('#matchTable').html();
		var template = Handlebars.compile(source);

		$('#unMadeContainer').append(template(element));

		data.push([element.id, element.lowerTier+' - '+element.upperTier, element.lowerEff+' - '+element.upperEff, element.timeFilled-element.timeCreated, element.platoons.length, element.battlePoints, element.numOfPlayers]);
	});

	$('.matchTable').dataTable();
	$('#matchSummary').dataTable().fnClearTable();
	$('#matchSummary').dataTable().fnAddData(data);
}