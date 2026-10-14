self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{};}catch{}
  const title=data.title||'Unmask';
  const options={
    body:data.body||'You have a new Unmask update.',
    icon:'/resources/unmask-logo.png',
    badge:'/resources/unmask-logo.png',
    data:{url:data.url||'/?view=dashboard',notificationId:data.notificationId||null},
    vibrate:[80,40,80],
    tag:data.notificationId||undefined
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'/?view=dashboard',self.location.origin).href;
  event.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
      for(const client of list){
        if('focus' in client){
          client.navigate(target);
          return client.focus();
        }
      }
      return clients.openWindow?clients.openWindow(target):undefined;
    })
  );
});
