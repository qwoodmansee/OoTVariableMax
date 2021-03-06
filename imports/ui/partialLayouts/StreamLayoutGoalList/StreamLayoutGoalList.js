/**
 * Views Goal List stored with associated timer
 * Created by Quinton on 9/24/2016.
 */

import {Timers} from "../../../api/timers/Timers.js"
import {PageViewers} from "../../../api/pageViewers/PageViewers.js"

import './StreamLayoutGoalList.html'
import './StreamLayoutGoalList.css'

const PRECHOSEN_GOAL_POINT_VALUE = 20;
const NORMAL_GOAL_POINT_VALUE = 15;
const SUPER_BONUS_VALUE = 50;

//check equality in html
Template.registerHelper('equals', function (a, b) {
    return a === b;
});

Template.StreamLayoutGoalList.onCreated(function() {
    var self = this;

    //set up reactives associated with goal card
    self.goals = new ReactiveVar([]);
    self.goalsSelected = new ReactiveVar([]);
    self.completedGoals = new ReactiveVar([]);

    self.autorun(function() {
        self.subscribe('singleTimer', FlowRouter.getParam('username'), {
            onReady: function() {
                var goalsCurrentlySelected = [];

                // this will be final now since singleTimer's on ready has been called
                var timer = Timers.findOne();

                if (timer) {
                    //initialize reactives to initial timer value
                    var goals = timer['goals'];
                    Session.set("goals", goals);
                    self.goals.set(goals);
                    for (var i = 0; i < goals.length; i++) {
                        //set required goals as chosen
                        if (goals[i].required === true) {
                            goalsCurrentlySelected.push(i);
                        }
                    }
                    self.goalsSelected.set(goalsCurrentlySelected);
                    Session.set("numGoalsRequired", timer['goalsRequired']);

                    //subscribe to pageViewers and make sure if you aren't added to it yet to add yourself
                    self.subscribe('pageViewers', {
                        onReady: function() {
                            //logged in users get a pageViewer entry/are tracked on page
                            if (Meteor.userId()) {
                                //if we are setting this up there should be a page viewer at this point, but we will make sure
                                var viewers = PageViewers.findOne({
                                    username: Meteor.user().profile.name,
                                    ownerUsername: FlowRouter.getParam('username')
                                });
                            }

                            //set up a function to be called whenever the timer is updated
                            var query = Timers.find();
                            var handle = query.observeChanges({
                                changed: function(id, fields) {

                                    if (fields['running'] === true) {
                                        //timer started by owner

                                    } else if (fields['running'] === false) {

                                        if (fields.hasOwnProperty('goals')) {
                                            // new timer from existing running timer
                                            Session.set("goals", fields['goals']);
                                            self.goals.set(fields['goals']);
                                            goalsCurrentlySelected = [];
                                            for (var i = 0; i < self.goals.get().length; i++) {
                                                //set required goals as chosen
                                                if (self.goals.get()[i].required === true) {
                                                    goalsCurrentlySelected.push(i);
                                                }
                                            }
                                            self.goalsSelected.set(goalsCurrentlySelected);
                                            if (fields.hasOwnProperty('goalsRequired')) {
                                                Session.set("numGoalsRequired", fields['goalsRequired']);
                                            }


                                        } else {
                                            // timer ended (hit 00:00:00) - this actually might not happen
                                        }
                                    }

                                    if (fields.hasOwnProperty('goals')) {
                                        // new timer from non started timer
                                        Session.set("goals", fields['goals']);
                                        self.goals.set(fields['goals']);
                                        var goalsSelected = [];
                                        for (var i = 0; i < self.goals.get().length; i++) {
                                            //set required goals as chosen
                                            if (self.goals.get()[i].required === true) {
                                                goalsSelected.push(i);
                                            }
                                        }
                                        self.goalsSelected.set(goalsSelected);
                                        if (fields.hasOwnProperty('goalsRequired')) {
                                            Session.set("numGoalsRequired", fields['goalsRequired']);
                                        }
                                    }
                                }
                            });
                        }
                    });
                }
            }
        });
    });

    //this function will run anytime selected goals change, and will update the highlighted goals accordingly
    self.autorun(function() {
        // get all the selected goals (makes this reactive and happen on changes)
        var selectedIndexes = self.goalsSelected.get();

        // get all the goal card objects
        $('.goal-card').each(function(index) {
            if (selectedIndexes.indexOf(index) === -1 ) {
                //if goal is not selected make sure it doesnt have required class
                $(this).removeClass('required');
            } else {
                //if goal is selected give it the required (and locked since it's prechosen) class
                $(this).addClass('required');

            }
        });


    });
    Session.setDefault('createWindowSessionVar', false);
});

Template.StreamLayoutGoalList.onRendered(function(){

});

Template.StreamLayoutGoalList.helpers({
    userLoggedIn() {
        return Meteor.userId();
    },

    goals() {
       return Session.get('goals');
    },

    numGoalsRequired() {
        return Session.get("numGoalsRequired");
    },

    superGoalBonusAvailable() {
        return Session.get('goals').length > Session.get('numGoalsRequired') * 2;
    }
});

Template.StreamLayoutGoalList.events({
    'click .stream-layout-goal-card': function(event) {
       //get the number of complete goals
       var numGoalsComplete = $('.complete').length;
       var numGoalsTotal =  Session.get('goals').length;
       var numPrechosen = $('.required').length;
       var numGoalsRequired = Session.get('numGoalsRequired');

       //get the goals
       var goals = Session.get('goals');
       for (var i=0; i < goals.length; i++) {
           if (goals[i].name === this.name) {
               var temp = Session.get('score');

               // if goal clicked is required
               if (goals[i].required) {
                   // if goal is becoming incomplete
                   if (goals[i].complete) {
                       numGoalsComplete -= 1;

                        if (numGoalsComplete < numGoalsRequired) {
                            temp -= PRECHOSEN_GOAL_POINT_VALUE;
                        } else {
                            temp -= PRECHOSEN_GOAL_POINT_VALUE - NORMAL_GOAL_POINT_VALUE;
                        }
                       if ((numGoalsComplete == numGoalsTotal - 1) && numGoalsTotal > numGoalsRequired * 2) {
                           temp -= SUPER_BONUS_VALUE;
                       }
                       goals[i].complete = false;
                   } else {
                       numGoalsComplete += 1;

                       // if the goal is becoming complete add 20 points
                       if (numGoalsComplete <= numGoalsRequired) {
                        temp += PRECHOSEN_GOAL_POINT_VALUE;
                       } else {
                        temp += PRECHOSEN_GOAL_POINT_VALUE - NORMAL_GOAL_POINT_VALUE;
                       }

                       if ((numGoalsComplete == numGoalsTotal) && numGoalsTotal > numGoalsRequired * 2) {
                           temp += SUPER_BONUS_VALUE;
                       }
                       goals[i].inProgress = false;
                       goals[i].complete = true;
                   }
               } else {
                   // if the goal is not required
                   // else if the goal is becoming incomplete and the required number of goals (after removal) is not met
                   if (goals[i].complete) {
                       numGoalsComplete -= 1;
                       if (numGoalsComplete < numGoalsRequired) {
                           // take away points
                           temp -= NORMAL_GOAL_POINT_VALUE;
                       }
                       if ((numGoalsComplete == numGoalsTotal - 1) && numGoalsTotal > numGoalsRequired * 2) {
                           temp -= SUPER_BONUS_VALUE;
                       }
                       goals[i].complete = false;
                   } else if (!goals[i].complete) {
                        numGoalsComplete += 1;
                        // if the goal is becoming complete
                        if (numGoalsComplete - 1 < numGoalsRequired) {
                            // and we have not met the number of required goals
                            // give points
                            temp += NORMAL_GOAL_POINT_VALUE;
                        }
                       if ((numGoalsComplete == numGoalsTotal) && numGoalsTotal > numGoalsRequired * 2) {
                           temp += SUPER_BONUS_VALUE;
                       }
                       goals[i].inProgress = false;
                       goals[i].complete = true;
                   }
               }

               Session.set('score', temp);
               break;
           }
       }

       //set the goals once changed
       Session.set('goals', goals);
   },

    'contextmenu .stream-layout-goal-card': function(event) {
       event.preventDefault();
        //get the goals
        var goals = Session.get('goals');
        for (var i=0; i < goals.length; i++) {
            if (goals[i].name === this.name) {
                if (goals[i].complete) {
                    var temp = Session.get('score');
                    if (goals[i].required) {
                        temp -= PRECHOSEN_GOAL_POINT_VALUE;
                    } else {
                        temp -= NORMAL_GOAL_POINT_VALUE;
                    }
                    Session.set('score', temp);
                    goals[i].complete = false;
                    goals[i].inProgress = true;
                } else if (goals[i].inProgress) {
                    goals[i].complete = false;
                    goals[i].inProgress = false;
                } else {
                    goals[i].inProgress = true;
                }
                break;
            }
        }

        //set the goals once changed
        Session.set('goals', goals);
        return false;

    },

    'click #stream-card-open': function() {
       var requiredGoalObjects = $('.required');

        if (!$('#stream-card-open').hasClass('disabled')) {
            var popout = new Popout({
                template : 'StreamCard',
                on : 'createWindowSessionVar',
                win : true, // or tab : true
                context : {goals: requiredGoalObjects, goalsCompleted: Template.instance().completedGoals}
            });
            popout.show();
            $('#stream-card-open').addClass('disabled');
        } else {
            Session.set('createWindowSessionVar', true);
        }

   }
});