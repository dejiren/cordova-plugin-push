//
//  NotificationService.h
//  notificationExt
//
//  Created by dejiren-user on 2022/12/05.
//

#import <UserNotifications/UserNotifications.h>

@interface NotificationService : UNNotificationServiceExtension

#define NOTIFICATIONEXT_GROUP_IDENTIFIER @"__GROUP_IDENTIFIER__"
#define NOTIFICATIONEXT_GROUP_BADGE_KEY @"__GROUP_BADGE_KEY__"

@end
