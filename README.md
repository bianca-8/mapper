*NEW May 10*
The heatmap now works! Toggle on/off to see the places where you visit most often. The display friend button is still a work in progress...

*May 8*
This time, I focused on creating friending within the website between accounts. You can send and receive friend requests, see pending friend requests, and delete friend requests. (The heatmap is not finished yet though...the toggle works tho!)

I worked more in Supabase too since the friends are stored in the database.

--------------

Mapper is a map to see where you've gone in the world and where your friends have gone! I've travelled to many places and I came up with this idea similar to an app that allows you to see what your friends are listening to on Spotify, instead this allows you to see where your friends have been. Who knows, maybe you guys travelled to the same place without even knowing!

I'm still working on some features but the core functionality is all there.

First hackatime submission: 13 hours 51 mins
Current hackatime submission: 20 hours

Moving around might be difficult so if you hold shift + drag your location it will also move the dot and create cirles for where you've been (This is just temporary for testing).

I used HTML, CSS and JavaScript for the website, and Supabase for authentication and the database.

Eventually, I want to make this into an app to be downloaded on a phone.

If you have any suggestions for what to add feel free to tell me :D

*How to use*
- You must allow your location for it to properly work
- Uncover the map as you walk around (for now you can also just drag your location dot)
- Log in to save your locations
- Choose your profile picture, username and custom color
- Friend others to see your mutual locations (coming soon)

[![Youtube Video: https://www.youtube.com/watch?v=21XojbM4FUU](https://img.youtube.com/vi/21XojbM4FUU/0.jpg)](https://youtu.be/21XojbM4FUU)

*To add:*
- display friends' circles - hover over circles allows you to see their username
- display everyone's circles - show this if not allowed location
- fix popup on force reload
- fix heatmap entire button flipping the switch

- fix overlay location dot sizing during map resize
- timeline of where you were over time (timestamps)
- fix moving map around and the circles and location don't move smoothly
- change px
- chat/react to places - be able to select a circle if you click it and there's actions such as react, which sends to the chat with that person
- timestamps
- notification showing you have a friend request
- confirmation for removing friends
- choosing username should be optional - it automatically makes one for them if they don't choose - OR MAKE IT SO THAT YOU MUST CHOOSE BUT SAY CAN CHANGE LATER
- in the no friends yet, add rotating messages
- share app with others and they join - unlock perks
- add notes at a place
- share your map - unique link
- test actual location and moving
- check default username profile picture is green
- add login with username
- fix incognito image
- reset password, double auth
- make circles bigger/smaller for optimal size for privacy
- host on website
- make into app
- should stay logged in on app
